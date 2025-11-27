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
  if (profile.skills && profile.skills.length > 0 && job.requirements && job.requirements.length > 0) {
    const profileSkills = profile.skills.map(s => s.toLowerCase());
    const jobRequirements = job.requirements.map(r => r.toLowerCase());

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
      'remote': 2
    };

    const expectedYears = jobTypeExpectation[job.type] || 2;

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
  if (profile.preferredLocation || profile.location) {
    const preferredLoc = (profile.preferredLocation || profile.location || '').toLowerCase();
    const jobLoc = (job.location || '').toLowerCase();

    let locationScore = 50; // Default partial match

    if (job.type === 'remote') {
      locationScore = 100;
    } else if (preferredLoc && jobLoc) {
      if (jobLoc.includes(preferredLoc) || preferredLoc.includes(jobLoc)) {
        locationScore = 100;
      }
    }

    score += locationScore * 0.15;
    factors += 0.15;
  }

  // 5. Salary match (10% weight)
  if (profile.expectedSalary && job.salary) {
    let salaryScore = 50;

    if (job.salary.min && job.salary.max) {
      const expectedMin = profile.expectedSalary.min || 0;
      const expectedMax = profile.expectedSalary.max || Infinity;

      if (job.salary.max >= expectedMin && job.salary.min <= expectedMax) {
        salaryScore = 100;
      } else if (job.salary.max >= expectedMin * 0.8) {
        salaryScore = 70;
      }
    }

    score += salaryScore * 0.1;
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
      const jobs = await Job.find({ status: 'open' })
        .populate('employer', 'email')
        .populate('employerProfile', 'companyName companyLogo')
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

    // Get all open jobs that user hasn't applied to
    const jobs = await Job.find({
      status: 'open',
      _id: { $nin: appliedJobIds }
    })
      .populate('employer', 'email')
      .populate('employerProfile', 'companyName companyLogo');

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
  if (profile.skills && profile.skills.length > 0 && job.requirements && job.requirements.length > 0) {
    const profileSkills = profile.skills.map(s => s.toLowerCase());
    const jobRequirements = job.requirements.map(r => r.toLowerCase());

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

  // Location
  if (job.type === 'remote') {
    reasons.push('Remote work available');
  } else if (profile.preferredLocation || profile.location) {
    const preferredLoc = (profile.preferredLocation || profile.location || '').toLowerCase();
    const jobLoc = (job.location || '').toLowerCase();
    if (jobLoc.includes(preferredLoc) || preferredLoc.includes(jobLoc)) {
      reasons.push('Location matches preference');
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
      status: 'open'
    })
      .populate('employer', 'email')
      .populate('employerProfile', 'companyName companyLogo');

    const scoredJobs = jobs.map(job => {
      let score = 0;

      // Same category/type
      if (job.type === referenceJob.type) score += 30;

      // Similar requirements
      if (job.requirements && referenceJob.requirements) {
        const jobReqs = job.requirements.map(r => r.toLowerCase());
        const refReqs = referenceJob.requirements.map(r => r.toLowerCase());
        const overlap = jobReqs.filter(r => refReqs.some(ref => ref.includes(r) || r.includes(ref)));
        score += (overlap.length / Math.max(refReqs.length, 1)) * 40;
      }

      // Similar location
      if (job.location && referenceJob.location) {
        if (job.location.toLowerCase() === referenceJob.location.toLowerCase()) {
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
