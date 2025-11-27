const Job = require('../models/Job');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const Application = require('../models/Application');

/**
 * Calculate match score between a job and a job seeker profile
 * Returns a score between 0 and 100
 */
const calculateMatchScore = (job, profile) => {
  let score = 0;
  let factors = 0;

  // 1. Skills match (40% weight)
  const jobSkills = job.requirements?.skills || [];
  if (profile.skills && profile.skills.length > 0 && jobSkills.length > 0) {
    const profileSkills = profile.skills.map(s => s.toLowerCase());
    const jobRequirements = jobSkills.map(r => r.toLowerCase());

    const matchedSkills = profileSkills.filter(skill =>
      jobRequirements.some(req => req.includes(skill) || skill.includes(req))
    );

    const skillScore = (matchedSkills.length / Math.max(jobRequirements.length, 1)) * 100;
    score += skillScore * 0.4;
    factors += 0.4;
  }

  // 2. Experience level match (20% weight)
  if (profile.experience && profile.experience.length > 0) {
    const totalYears = calculateTotalExperience(profile.experience);
    let experienceScore = 0;

    // Map job types to expected experience
    const jobTypeExpectation = {
      'full-time': 2,
      'part-time': 1,
      'contract': 3,
      'internship': 0,
      'temporary': 1
    };

    const expectedYears = jobTypeExpectation[job.jobType] || 2;

    if (totalYears >= expectedYears) {
      experienceScore = 100;
    } else if (totalYears >= expectedYears * 0.5) {
      experienceScore = 70;
    } else {
      experienceScore = 40;
    }

    score += experienceScore * 0.2;
    factors += 0.2;
  }

  // 3. Education match (15% weight)
  if (profile.education && profile.education.length > 0) {
    const hasRelevantEducation = profile.education.some(edu => {
      const field = (edu.fieldOfStudy || '').toLowerCase();
      const title = (job.title || '').toLowerCase();
      const description = (job.description || '').toLowerCase();

      return title.includes(field) ||
             description.includes(field) ||
             field.includes('computer') ||
             field.includes('engineering') ||
             field.includes('business');
    });

    score += (hasRelevantEducation ? 100 : 50) * 0.15;
    factors += 0.15;
  }

  // 4. Location match (15% weight)
  if (profile.location) {
    const profileCity = (profile.location.city || '').toLowerCase();
    const profileCountry = (profile.location.country || '').toLowerCase();
    const jobCity = (job.location?.city || '').toLowerCase();
    const jobCountry = (job.location?.country || '').toLowerCase();

    let locationScore = 50; // Default partial match

    if (job.location?.remote) {
      locationScore = 100;
    } else if (profileCity && jobCity) {
      if (jobCity.includes(profileCity) || profileCity.includes(jobCity)) {
        locationScore = 100;
      } else if (jobCountry === profileCountry) {
        locationScore = 70;
      }
    } else if (profileCountry && jobCountry && profileCountry === jobCountry) {
      locationScore = 70;
    }

    score += locationScore * 0.15;
    factors += 0.15;
  }

  // 5. Job type preference match (10% weight)
  if (profile.preferredJobTypes && profile.preferredJobTypes.length > 0) {
    let jobTypeScore = 50;

    if (profile.preferredJobTypes.includes(job.jobType)) {
      jobTypeScore = 100;
    }
    // Check for remote preference
    if (profile.preferredJobTypes.includes('remote') && job.location?.remote) {
      jobTypeScore = 100;
    }

    score += jobTypeScore * 0.1;
    factors += 0.1;
  }

  // Normalize if not all factors were evaluated
  if (factors > 0 && factors < 1) {
    score = score / factors;
  }

  return Math.round(score);
};

/**
 * Calculate total years of experience from experience array
 */
const calculateTotalExperience = (experience) => {
  if (!experience || experience.length === 0) return 0;

  let totalMonths = 0;
  const now = new Date();

  experience.forEach(exp => {
    const startDate = new Date(exp.startDate);
    const endDate = exp.current ? now : new Date(exp.endDate);

    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                   (endDate.getMonth() - startDate.getMonth());

    totalMonths += Math.max(0, months);
  });

  return totalMonths / 12;
};

/**
 * Get job recommendations for a user
 * @param {string} userId - The job seeker's user ID
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Array of recommended jobs with match scores
 */
const getJobRecommendations = async (userId, limit = 10) => {
  try {
    // Get the job seeker's profile
    const profile = await JobSeekerProfile.findOne({ user: userId });

    if (!profile) {
      // Return latest jobs if no profile
      const jobs = await Job.find({ status: 'active' })
        .populate('employer', 'email')
        .populate('employerProfile', 'companyName logo')
        .sort({ createdAt: -1 })
        .limit(limit);

      return jobs.map(job => ({
        job,
        matchScore: 50,
        matchReasons: ['New job posting']
      }));
    }

    // Get jobs the user has already applied to
    const applications = await Application.find({ jobSeeker: userId });
    const appliedJobIds = applications.map(app => app.job.toString());

    // Get all active jobs that user hasn't applied to
    const jobs = await Job.find({
      status: 'active',
      _id: { $nin: appliedJobIds }
    })
      .populate('employer', 'email')
      .populate('employerProfile', 'companyName logo');

    // Calculate match scores
    const scoredJobs = jobs.map(job => {
      const matchScore = calculateMatchScore(job, profile);
      const matchReasons = getMatchReasons(job, profile);

      return {
        job,
        matchScore,
        matchReasons
      };
    });

    // Sort by match score and return top results
    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    return scoredJobs.slice(0, limit);
  } catch (error) {
    console.error('Error getting job recommendations:', error);
    throw error;
  }
};

/**
 * Get human-readable reasons for job match
 */
const getMatchReasons = (job, profile) => {
  const reasons = [];

  // Skills match
  const jobSkills = job.requirements?.skills || [];
  if (profile.skills && profile.skills.length > 0 && jobSkills.length > 0) {
    const profileSkills = profile.skills.map(s => s.toLowerCase());
    const jobRequirements = jobSkills.map(r => r.toLowerCase());

    const matchedSkills = profileSkills.filter(skill =>
      jobRequirements.some(req => req.includes(skill) || skill.includes(req))
    );

    if (matchedSkills.length > 0) {
      reasons.push(`Skills match: ${matchedSkills.slice(0, 3).join(', ')}`);
    }
  }

  // Experience
  if (profile.experience && profile.experience.length > 0) {
    const totalYears = calculateTotalExperience(profile.experience);
    if (totalYears > 0) {
      reasons.push(`${Math.round(totalYears)} years of experience`);
    }
  }

  // Location / Remote
  if (job.location?.remote) {
    reasons.push('Remote work available');
  } else if (profile.location) {
    const profileCity = (profile.location.city || '').toLowerCase();
    const jobCity = (job.location?.city || '').toLowerCase();
    if (profileCity && jobCity && (jobCity.includes(profileCity) || profileCity.includes(jobCity))) {
      reasons.push('Location matches preference');
    }
  }

  // Job type preference
  if (profile.preferredJobTypes && profile.preferredJobTypes.length > 0) {
    if (profile.preferredJobTypes.includes(job.jobType)) {
      reasons.push(`Matches preferred job type: ${job.jobType}`);
    }
  }

  // Salary
  if (profile.expectedSalary && job.salary && job.salary.min && job.salary.max) {
    const expectedMin = profile.expectedSalary.min || 0;
    if (job.salary.max >= expectedMin) {
      reasons.push('Salary in expected range');
    }
  }

  if (reasons.length === 0) {
    reasons.push('New opportunity');
  }

  return reasons;
};

/**
 * Get similar jobs based on a specific job
 */
const getSimilarJobs = async (jobId, limit = 5) => {
  try {
    const referenceJob = await Job.findById(jobId);
    if (!referenceJob) return [];

    const jobs = await Job.find({
      _id: { $ne: jobId },
      status: 'active'
    })
      .populate('employer', 'email')
      .populate('employerProfile', 'companyName logo');

    const scoredJobs = jobs.map(job => {
      let score = 0;

      // Same job type
      if (job.jobType === referenceJob.jobType) score += 30;

      // Similar requirements/skills
      const jobSkills = job.requirements?.skills || [];
      const refSkills = referenceJob.requirements?.skills || [];
      if (jobSkills.length > 0 && refSkills.length > 0) {
        const jobReqs = jobSkills.map(r => r.toLowerCase());
        const refReqs = refSkills.map(r => r.toLowerCase());
        const overlap = jobReqs.filter(r => refReqs.some(ref => ref.includes(r) || r.includes(ref)));
        score += (overlap.length / Math.max(refReqs.length, 1)) * 40;
      }

      // Similar location
      if (job.location && referenceJob.location) {
        const jobCity = (job.location.city || '').toLowerCase();
        const refCity = (referenceJob.location.city || '').toLowerCase();
        if (jobCity && refCity && jobCity === refCity) {
          score += 15;
        } else if (job.location.remote && referenceJob.location.remote) {
          score += 15;
        }
      }

      // Similar salary range
      if (job.salary && referenceJob.salary) {
        const jobMid = ((job.salary.min || 0) + (job.salary.max || 0)) / 2;
        const refMid = ((referenceJob.salary.min || 0) + (referenceJob.salary.max || 0)) / 2;
        if (refMid > 0 && Math.abs(jobMid - refMid) / refMid < 0.3) {
          score += 15;
        }
      }

      return { job, score };
    });

    scoredJobs.sort((a, b) => b.score - a.score);
    return scoredJobs.slice(0, limit).map(item => item.job);
  } catch (error) {
    console.error('Error getting similar jobs:', error);
    throw error;
  }
};

module.exports = {
  calculateMatchScore,
  getJobRecommendations,
  getSimilarJobs,
  getMatchReasons
};
