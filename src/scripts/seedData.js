/**
 * Seed script for Job Agency System
 * Run with: node src/scripts/seedData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Models
const User = require('../models/User');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const TrainingCenterProfile = require('../models/TrainingCenterProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const TrainingCourse = require('../models/TrainingCourse');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  console.log('Clearing existing data...');
  await Application.deleteMany({});
  await Job.deleteMany({});
  await TrainingCourse.deleteMany({});
  await JobSeekerProfile.deleteMany({});
  await EmployerProfile.deleteMany({});
  await TrainingCenterProfile.deleteMany({});
  await User.deleteMany({});
  console.log('Data cleared.');
};

// Helper to get date X days ago
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Helper to get date X days from now
const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Seed data
const seedData = async () => {
  const plainPassword = 'Test1234!';

  // ==================== USERS ====================
  console.log('Creating users...');

  // Admin (created 6 months ago)
  const admin = await User.create({
    email: 'admin@jobagency.com',
    password: plainPassword,
    role: 'admin',
    isVerified: true,
    isActive: true
  });
  await User.updateOne({ _id: admin._id }, { $set: { createdAt: daysAgo(180), updatedAt: daysAgo(180) } });

  // Employers (created at different times)
  const employer1 = await User.create({ email: 'hr@techcorp.com', password: plainPassword, role: 'employer', isVerified: true, isActive: true });
  await User.updateOne({ _id: employer1._id }, { $set: { createdAt: daysAgo(150), updatedAt: daysAgo(150) } });

  const employer2 = await User.create({ email: 'hiring@innovate.io', password: plainPassword, role: 'employer', isVerified: true, isActive: true });
  await User.updateOne({ _id: employer2._id }, { $set: { createdAt: daysAgo(120), updatedAt: daysAgo(120) } });

  const employer3 = await User.create({ email: 'careers@globalfinance.com', password: plainPassword, role: 'employer', isVerified: true, isActive: true });
  await User.updateOne({ _id: employer3._id }, { $set: { createdAt: daysAgo(90), updatedAt: daysAgo(90) } });

  const employers = [employer1, employer2, employer3];

  // Job Seekers (created at different times over 6 months)
  const jobSeeker1 = await User.create({ email: 'john.doe@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker1._id }, { $set: { createdAt: daysAgo(160), updatedAt: daysAgo(160) } });

  const jobSeeker2 = await User.create({ email: 'jane.smith@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker2._id }, { $set: { createdAt: daysAgo(140), updatedAt: daysAgo(140) } });

  const jobSeeker3 = await User.create({ email: 'mike.wilson@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker3._id }, { $set: { createdAt: daysAgo(100), updatedAt: daysAgo(100) } });

  const jobSeeker4 = await User.create({ email: 'sarah.johnson@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker4._id }, { $set: { createdAt: daysAgo(75), updatedAt: daysAgo(75) } });

  const jobSeeker5 = await User.create({ email: 'alex.chen@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker5._id }, { $set: { createdAt: daysAgo(45), updatedAt: daysAgo(45) } });

  const jobSeeker6 = await User.create({ email: 'emma.davis@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker6._id }, { $set: { createdAt: daysAgo(30), updatedAt: daysAgo(30) } });

  const jobSeeker7 = await User.create({ email: 'david.kim@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker7._id }, { $set: { createdAt: daysAgo(20), updatedAt: daysAgo(20) } });

  const jobSeeker8 = await User.create({ email: 'lisa.wang@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker8._id }, { $set: { createdAt: daysAgo(10), updatedAt: daysAgo(10) } });

  const jobSeeker9 = await User.create({ email: 'chris.taylor@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker9._id }, { $set: { createdAt: daysAgo(5), updatedAt: daysAgo(5) } });

  const jobSeeker10 = await User.create({ email: 'amy.martinez@email.com', password: plainPassword, role: 'jobseeker', isVerified: true, isActive: true });
  await User.updateOne({ _id: jobSeeker10._id }, { $set: { createdAt: daysAgo(2), updatedAt: daysAgo(2) } });

  const jobSeekers = [jobSeeker1, jobSeeker2, jobSeeker3, jobSeeker4, jobSeeker5, jobSeeker6, jobSeeker7, jobSeeker8, jobSeeker9, jobSeeker10];

  // Training Centers
  const trainingCenter1 = await User.create({ email: 'info@techacademy.com', password: plainPassword, role: 'training_center', isVerified: true, isActive: true });
  await User.updateOne({ _id: trainingCenter1._id }, { $set: { createdAt: daysAgo(130), updatedAt: daysAgo(130) } });

  const trainingCenter2 = await User.create({ email: 'contact@skillsboost.com', password: plainPassword, role: 'training_center', isVerified: true, isActive: true });
  await User.updateOne({ _id: trainingCenter2._id }, { $set: { createdAt: daysAgo(85), updatedAt: daysAgo(85) } });

  const trainingCenters = [trainingCenter1, trainingCenter2];

  console.log('Users created with varied dates.');

  // ==================== JOB SEEKER PROFILES ====================
  console.log('Creating job seeker profiles...');

  const jobSeekerProfiles = await JobSeekerProfile.create([
    {
      user: jobSeekers[0]._id,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1-555-0101',
      dateOfBirth: new Date('1995-03-15'),
      gender: 'male',
      location: { city: 'New York', state: 'NY', country: 'USA' },
      bio: 'Passionate full-stack developer with 3 years of experience building web applications.',
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'TypeScript', 'Git', 'REST APIs'],
      experience: [
        { company: 'StartupXYZ', position: 'Junior Developer', startDate: new Date('2021-06-01'), endDate: new Date('2023-01-01'), current: false, description: 'Built web applications using React and Node.js' },
        { company: 'WebAgency Inc', position: 'Full Stack Developer', startDate: new Date('2023-02-01'), current: true, description: 'Leading frontend development' }
      ],
      education: [{ institution: 'State University', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', startDate: new Date('2017-09-01'), endDate: new Date('2021-05-01'), grade: '3.7 GPA' }],
      preferredJobTypes: ['full-time', 'remote'],
      expectedSalary: { min: 70000, max: 100000, currency: 'USD' }
    },
    {
      user: jobSeekers[1]._id,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1-555-0102',
      dateOfBirth: new Date('1992-07-22'),
      gender: 'female',
      location: { city: 'San Francisco', state: 'CA', country: 'USA' },
      bio: 'Data scientist with expertise in machine learning and Python.',
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Data Analysis', 'Pandas', 'Statistics'],
      experience: [
        { company: 'DataCorp', position: 'Data Analyst', startDate: new Date('2018-03-01'), endDate: new Date('2021-06-01'), current: false, description: 'Analyzed large datasets' },
        { company: 'AI Solutions', position: 'Data Scientist', startDate: new Date('2021-07-01'), current: true, description: 'Building ML models' }
      ],
      education: [{ institution: 'Tech University', degree: 'Master of Science', fieldOfStudy: 'Data Science', startDate: new Date('2016-09-01'), endDate: new Date('2018-05-01'), grade: '3.9 GPA' }],
      preferredJobTypes: ['full-time'],
      expectedSalary: { min: 90000, max: 130000, currency: 'USD' }
    },
    {
      user: jobSeekers[2]._id,
      firstName: 'Mike',
      lastName: 'Wilson',
      phone: '+1-555-0103',
      dateOfBirth: new Date('1998-11-08'),
      gender: 'male',
      location: { city: 'Austin', state: 'TX', country: 'USA' },
      bio: 'Recent graduate eager to start a career in software development.',
      skills: ['Java', 'Spring Boot', 'AWS', 'Docker', 'MySQL', 'Git'],
      experience: [{ company: 'Tech Startup', position: 'Software Engineering Intern', startDate: new Date('2023-05-01'), endDate: new Date('2023-08-01'), current: false, description: 'Developed microservices' }],
      education: [{ institution: 'Austin College', degree: 'Bachelor of Science', fieldOfStudy: 'Software Engineering', startDate: new Date('2019-09-01'), endDate: new Date('2023-05-01'), grade: '3.5 GPA' }],
      preferredJobTypes: ['full-time', 'internship'],
      expectedSalary: { min: 55000, max: 75000, currency: 'USD' }
    },
    {
      user: jobSeekers[3]._id,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+1-555-0104',
      dateOfBirth: new Date('1990-05-30'),
      gender: 'female',
      location: { city: 'Chicago', state: 'IL', country: 'USA' },
      bio: 'Senior UX designer with 8 years of experience.',
      skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'User Research', 'Prototyping', 'Design Systems', 'HTML', 'CSS'],
      experience: [
        { company: 'Design Studio', position: 'UX Designer', startDate: new Date('2016-01-01'), endDate: new Date('2020-03-01'), current: false, description: 'Led UX design' },
        { company: 'ProductCo', position: 'Senior UX Designer', startDate: new Date('2020-04-01'), current: true, description: 'Leading design team' }
      ],
      education: [{ institution: 'Design Institute', degree: 'Bachelor of Fine Arts', fieldOfStudy: 'Graphic Design', startDate: new Date('2011-09-01'), endDate: new Date('2015-05-01') }],
      preferredJobTypes: ['full-time', 'contract'],
      expectedSalary: { min: 100000, max: 140000, currency: 'USD' }
    },
    {
      user: jobSeekers[4]._id,
      firstName: 'Alex',
      lastName: 'Chen',
      phone: '+1-555-0105',
      dateOfBirth: new Date('1994-09-12'),
      gender: 'male',
      location: { city: 'Seattle', state: 'WA', country: 'USA' },
      bio: 'DevOps engineer specializing in cloud infrastructure.',
      skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Jenkins', 'Python', 'Linux', 'CI/CD'],
      experience: [{ company: 'Cloud Services Inc', position: 'DevOps Engineer', startDate: new Date('2019-08-01'), current: true, description: 'Managing AWS infrastructure' }],
      education: [{ institution: 'Washington Tech', degree: 'Bachelor of Science', fieldOfStudy: 'Information Technology', startDate: new Date('2014-09-01'), endDate: new Date('2018-05-01') }],
      preferredJobTypes: ['full-time', 'remote'],
      expectedSalary: { min: 110000, max: 150000, currency: 'USD' }
    },
    {
      user: jobSeekers[5]._id,
      firstName: 'Emma',
      lastName: 'Davis',
      phone: '+1-555-0106',
      gender: 'female',
      location: { city: 'Boston', state: 'MA', country: 'USA' },
      bio: 'Frontend developer passionate about creating beautiful user interfaces.',
      skills: ['JavaScript', 'React', 'Vue.js', 'CSS', 'Tailwind', 'TypeScript'],
      experience: [{ company: 'Web Studio', position: 'Frontend Developer', startDate: new Date('2022-01-01'), current: true, description: 'Building responsive web apps' }],
      education: [{ institution: 'Boston University', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', startDate: new Date('2018-09-01'), endDate: new Date('2022-05-01') }],
      preferredJobTypes: ['full-time'],
      expectedSalary: { min: 65000, max: 85000, currency: 'USD' }
    },
    {
      user: jobSeekers[6]._id,
      firstName: 'David',
      lastName: 'Kim',
      phone: '+1-555-0107',
      gender: 'male',
      location: { city: 'Los Angeles', state: 'CA', country: 'USA' },
      bio: 'Mobile developer with expertise in iOS and Android.',
      skills: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'Firebase'],
      experience: [{ company: 'Mobile Apps Inc', position: 'Mobile Developer', startDate: new Date('2021-06-01'), current: true, description: 'Developing cross-platform apps' }],
      education: [{ institution: 'UCLA', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', startDate: new Date('2017-09-01'), endDate: new Date('2021-05-01') }],
      preferredJobTypes: ['full-time', 'contract'],
      expectedSalary: { min: 80000, max: 110000, currency: 'USD' }
    },
    {
      user: jobSeekers[7]._id,
      firstName: 'Lisa',
      lastName: 'Wang',
      phone: '+1-555-0108',
      gender: 'female',
      location: { city: 'Denver', state: 'CO', country: 'USA' },
      bio: 'Backend developer focused on scalable systems.',
      skills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
      experience: [{ company: 'Backend Solutions', position: 'Backend Developer', startDate: new Date('2020-03-01'), current: true, description: 'Building APIs and microservices' }],
      education: [{ institution: 'Colorado State', degree: 'Bachelor of Science', fieldOfStudy: 'Software Engineering', startDate: new Date('2016-09-01'), endDate: new Date('2020-05-01') }],
      preferredJobTypes: ['full-time', 'remote'],
      expectedSalary: { min: 85000, max: 115000, currency: 'USD' }
    },
    {
      user: jobSeekers[8]._id,
      firstName: 'Chris',
      lastName: 'Taylor',
      phone: '+1-555-0109',
      gender: 'male',
      location: { city: 'Miami', state: 'FL', country: 'USA' },
      bio: 'Cybersecurity specialist protecting digital assets.',
      skills: ['Cybersecurity', 'Penetration Testing', 'Network Security', 'Python', 'Linux'],
      experience: [{ company: 'SecureTech', position: 'Security Analyst', startDate: new Date('2021-01-01'), current: true, description: 'Conducting security assessments' }],
      education: [{ institution: 'Florida Tech', degree: 'Bachelor of Science', fieldOfStudy: 'Cybersecurity', startDate: new Date('2017-09-01'), endDate: new Date('2021-05-01') }],
      preferredJobTypes: ['full-time'],
      expectedSalary: { min: 90000, max: 120000, currency: 'USD' }
    },
    {
      user: jobSeekers[9]._id,
      firstName: 'Amy',
      lastName: 'Martinez',
      phone: '+1-555-0110',
      gender: 'female',
      location: { city: 'Phoenix', state: 'AZ', country: 'USA' },
      bio: 'Product manager bridging tech and business.',
      skills: ['Product Management', 'Agile', 'Scrum', 'JIRA', 'Data Analysis', 'SQL'],
      experience: [{ company: 'ProductCo', position: 'Associate Product Manager', startDate: new Date('2022-06-01'), current: true, description: 'Managing product roadmap' }],
      education: [{ institution: 'Arizona State', degree: 'MBA', fieldOfStudy: 'Business Administration', startDate: new Date('2020-09-01'), endDate: new Date('2022-05-01') }],
      preferredJobTypes: ['full-time'],
      expectedSalary: { min: 95000, max: 125000, currency: 'USD' }
    }
  ]);

  console.log('Job seeker profiles created.');

  // ==================== EMPLOYER PROFILES ====================
  console.log('Creating employer profiles...');

  const employerProfiles = await EmployerProfile.create([
    {
      user: employers[0]._id,
      companyName: 'TechCorp Solutions',
      industry: 'Technology',
      companySize: '201-500',
      foundedYear: 2010,
      location: { address: '123 Tech Street', city: 'New York', state: 'NY', country: 'USA', zipCode: '10001' },
      website: 'https://techcorp.com',
      description: 'TechCorp Solutions is a leading software development company specializing in enterprise solutions.',
      contactPerson: { name: 'Emily Brown', position: 'HR Manager', email: 'emily@techcorp.com', phone: '+1-555-1001' },
      benefits: ['Health Insurance', '401k Match', 'Remote Work', 'Unlimited PTO', 'Stock Options'],
      culture: 'We foster innovation and collaboration.',
      isVerified: true
    },
    {
      user: employers[1]._id,
      companyName: 'Innovate.io',
      industry: 'Startup',
      companySize: '11-50',
      foundedYear: 2019,
      location: { address: '456 Innovation Ave', city: 'San Francisco', state: 'CA', country: 'USA', zipCode: '94105' },
      website: 'https://innovate.io',
      description: 'A fast-growing startup focused on AI-powered solutions for businesses.',
      contactPerson: { name: 'Tom Anderson', position: 'Founder & CEO', email: 'tom@innovate.io', phone: '+1-555-1002' },
      benefits: ['Equity Package', 'Health Insurance', 'Free Meals', 'Gym Membership'],
      culture: 'Fast-paced, innovative environment.',
      isVerified: true
    },
    {
      user: employers[2]._id,
      companyName: 'Global Finance Group',
      industry: 'Finance',
      companySize: '500+',
      foundedYear: 1995,
      location: { address: '789 Wall Street', city: 'New York', state: 'NY', country: 'USA', zipCode: '10005' },
      website: 'https://globalfinance.com',
      description: 'A premier financial services firm providing investment banking and wealth management.',
      contactPerson: { name: 'Jessica Lee', position: 'Talent Acquisition Lead', email: 'jessica@globalfinance.com', phone: '+1-555-1003' },
      benefits: ['Competitive Salary', 'Annual Bonus', 'Health Insurance', 'Pension Plan'],
      culture: 'Excellence-driven culture with emphasis on professional growth.',
      isVerified: true
    }
  ]);

  console.log('Employer profiles created.');

  // ==================== TRAINING CENTER PROFILES ====================
  console.log('Creating training center profiles...');

  const trainingCenterProfiles = await TrainingCenterProfile.create([
    {
      user: trainingCenters[0]._id,
      centerName: 'Tech Academy',
      description: 'Premier coding bootcamp offering intensive programs in web development and data science.',
      specializations: ['Web Development', 'Data Science', 'Cloud Computing', 'Mobile Development'],
      location: { address: '100 Learning Lane', city: 'New York', state: 'NY', country: 'USA', zipCode: '10010' },
      contactInfo: { phone: '+1-555-2001', email: 'info@techacademy.com', website: 'https://techacademy.com' },
      accreditations: [{ name: 'ACCET Accreditation', issuedBy: 'ACCET', year: 2018 }],
      establishedYear: 2015,
      isVerified: true,
      totalStudents: 5000,
      rating: { average: 4.8, count: 450 }
    },
    {
      user: trainingCenters[1]._id,
      centerName: 'SkillsBoost Institute',
      description: 'Professional development center offering certifications in project management and business analysis.',
      specializations: ['Project Management', 'Business Analysis', 'Leadership', 'Agile Methodologies'],
      location: { address: '200 Career Blvd', city: 'Chicago', state: 'IL', country: 'USA', zipCode: '60601' },
      contactInfo: { phone: '+1-555-2002', email: 'contact@skillsboost.com', website: 'https://skillsboost.com' },
      accreditations: [{ name: 'PMI Authorized Training Partner', issuedBy: 'PMI', year: 2019 }],
      establishedYear: 2012,
      isVerified: true,
      totalStudents: 3500,
      rating: { average: 4.6, count: 280 }
    }
  ]);

  console.log('Training center profiles created.');

  // ==================== JOBS (with varied dates) ====================
  console.log('Creating jobs with varied dates...');

  // Job templates for generating multiple jobs
  const jobTemplates = [
    { title: 'Senior Full Stack Developer', skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'TypeScript'], type: 'full-time', salaryMin: 90000, salaryMax: 130000 },
    { title: 'Machine Learning Engineer', skills: ['Python', 'TensorFlow', 'Machine Learning', 'Deep Learning', 'SQL'], type: 'full-time', salaryMin: 120000, salaryMax: 180000 },
    { title: 'Junior Frontend Developer', skills: ['JavaScript', 'React', 'HTML', 'CSS', 'Git'], type: 'full-time', salaryMin: 55000, salaryMax: 75000 },
    { title: 'DevOps Engineer', skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'], type: 'full-time', salaryMin: 100000, salaryMax: 150000 },
    { title: 'Senior Financial Analyst', skills: ['Financial Modeling', 'Excel', 'SQL', 'Python'], type: 'full-time', salaryMin: 120000, salaryMax: 180000 },
    { title: 'UX/UI Designer', skills: ['Figma', 'UI/UX Design', 'User Research', 'Prototyping'], type: 'full-time', salaryMin: 85000, salaryMax: 120000 },
    { title: 'Backend Developer (Java)', skills: ['Java', 'Spring Boot', 'Microservices', 'MySQL'], type: 'full-time', salaryMin: 80000, salaryMax: 110000 },
    { title: 'Software Engineering Intern', skills: ['Python', 'Java', 'Git', 'Problem Solving'], type: 'internship', salaryMin: 25, salaryMax: 35, period: 'hourly' },
    { title: 'Product Manager', skills: ['Product Management', 'Agile', 'Data Analysis'], type: 'full-time', salaryMin: 110000, salaryMax: 150000 },
    { title: 'Data Analyst', skills: ['SQL', 'Python', 'Tableau', 'Excel', 'Statistics'], type: 'full-time', salaryMin: 70000, salaryMax: 95000 },
    { title: 'Business Analyst', skills: ['Business Analysis', 'SQL', 'Requirements Gathering', 'JIRA'], type: 'full-time', salaryMin: 75000, salaryMax: 100000 },
    { title: 'Cloud Architect', skills: ['AWS', 'Azure', 'GCP', 'Terraform', 'Kubernetes'], type: 'full-time', salaryMin: 140000, salaryMax: 180000 },
    { title: 'Mobile Developer', skills: ['React Native', 'Swift', 'Kotlin', 'Flutter'], type: 'full-time', salaryMin: 85000, salaryMax: 125000 },
    { title: 'QA Engineer', skills: ['Selenium', 'Jest', 'Cypress', 'Testing', 'Automation'], type: 'full-time', salaryMin: 70000, salaryMax: 100000 },
    { title: 'Security Engineer', skills: ['Cybersecurity', 'Penetration Testing', 'SIEM', 'Firewalls'], type: 'full-time', salaryMin: 110000, salaryMax: 160000 },
    { title: 'Technical Writer', skills: ['Documentation', 'API Docs', 'Markdown', 'Technical Writing'], type: 'contract', salaryMin: 60000, salaryMax: 90000 },
    { title: 'Scrum Master', skills: ['Agile', 'Scrum', 'JIRA', 'Team Leadership'], type: 'full-time', salaryMin: 90000, salaryMax: 130000 },
    { title: 'Database Administrator', skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Database Optimization'], type: 'full-time', salaryMin: 85000, salaryMax: 120000 },
  ];

  const cities = [
    { city: 'New York', state: 'NY' },
    { city: 'San Francisco', state: 'CA' },
    { city: 'Austin', state: 'TX' },
    { city: 'Seattle', state: 'WA' },
    { city: 'Chicago', state: 'IL' },
    { city: 'Boston', state: 'MA' },
    { city: 'Denver', state: 'CO' },
    { city: 'Los Angeles', state: 'CA' },
  ];

  // Days with multiple job postings (clustered for realistic charts)
  const jobDays = [
    { day: 90, count: 4 },  // 3 months ago - big hiring day
    { day: 85, count: 2 },
    { day: 75, count: 3 },  // 2.5 months ago
    { day: 60, count: 5 },  // 2 months ago - big hiring push
    { day: 55, count: 2 },
    { day: 45, count: 3 },  // 1.5 months ago
    { day: 40, count: 2 },
    { day: 30, count: 4 },  // 1 month ago - another push
    { day: 25, count: 2 },
    { day: 20, count: 3 },
    { day: 14, count: 4 },  // 2 weeks ago
    { day: 10, count: 2 },
    { day: 7, count: 5 },   // 1 week ago - big day
    { day: 5, count: 3 },
    { day: 3, count: 4 },
    { day: 2, count: 2 },
    { day: 1, count: 3 },
    { day: 0, count: 2 },   // Today
  ];

  const jobsData = [];
  let templateIndex = 0;

  for (const { day, count } of jobDays) {
    for (let i = 0; i < count; i++) {
      const template = jobTemplates[templateIndex % jobTemplates.length];
      const employer = employers[templateIndex % employers.length];
      const employerProfile = employerProfiles[templateIndex % employerProfiles.length];
      const location = cities[templateIndex % cities.length];

      // Random deadline 14-60 days from now
      const deadlineDays = 14 + Math.floor(Math.random() * 47);

      jobsData.push({
        employer: employer._id,
        employerProfile: employerProfile._id,
        title: template.title,
        description: `We are looking for a talented ${template.title} to join our team.`,
        requirements: { skills: template.skills, experience: '2+ years', education: 'Bachelor\'s degree' },
        jobType: template.type,
        location: { city: location.city, state: location.state, country: 'USA', remote: Math.random() > 0.5 },
        salary: { min: template.salaryMin, max: template.salaryMax, currency: 'USD', period: template.period || 'yearly' },
        benefits: ['Health Insurance', 'Remote Work', '401k'],
        status: 'active',
        applicationDeadline: daysFromNow(deadlineDays),
        postedDate: daysAgo(day)
      });

      templateIndex++;
    }
  }

  const jobs = [];
  for (const jobData of jobsData) {
    const jobDoc = {
      ...jobData,
      createdAt: jobData.postedDate,
      updatedAt: jobData.postedDate
    };
    const result = await Job.collection.insertOne(jobDoc);
    jobs.push({ _id: result.insertedId, ...jobDoc });
  }

  console.log('Jobs created with varied dates.');

  // ==================== APPLICATIONS (with varied dates) ====================
  console.log('Creating applications with varied dates...');

  // Application statuses for variety
  const applicationStatuses = ['pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'hired'];

  // Cover letter templates
  const coverLetters = [
    'Excited to apply for this position!',
    'I believe my skills are a great match.',
    'Eager to contribute to your team.',
    'Looking forward to discussing this opportunity.',
    'My experience aligns well with this role.',
    'I am passionate about this field.',
    'Would love to bring my expertise to your company.',
    'Ready to make an impact in this position.'
  ];

  // Application days with counts (clustered for realistic charts)
  const applicationDays = [
    { day: 88, count: 3 },   // ~3 months ago
    { day: 85, count: 5 },
    { day: 82, count: 2 },
    { day: 75, count: 4 },   // ~2.5 months ago
    { day: 70, count: 6 },
    { day: 65, count: 3 },
    { day: 58, count: 7 },   // ~2 months ago - big application surge
    { day: 55, count: 4 },
    { day: 50, count: 3 },
    { day: 45, count: 5 },   // ~1.5 months ago
    { day: 42, count: 2 },
    { day: 38, count: 4 },
    { day: 32, count: 6 },   // ~1 month ago
    { day: 28, count: 3 },
    { day: 25, count: 5 },
    { day: 20, count: 4 },   // ~3 weeks ago
    { day: 17, count: 3 },
    { day: 14, count: 7 },   // 2 weeks ago - big application day
    { day: 12, count: 2 },
    { day: 10, count: 5 },
    { day: 8, count: 4 },    // ~1 week ago
    { day: 7, count: 6 },
    { day: 5, count: 8 },    // Big day
    { day: 4, count: 3 },
    { day: 3, count: 5 },
    { day: 2, count: 4 },
    { day: 1, count: 6 },
    { day: 0, count: 3 },    // Today
  ];

  let totalApplications = 0;
  const usedCombinations = new Set(); // Track job+jobSeeker combinations

  for (const { day, count } of applicationDays) {
    let createdForDay = 0;
    let attempts = 0;
    const maxAttempts = count * 10; // Prevent infinite loop

    while (createdForDay < count && attempts < maxAttempts) {
      attempts++;

      // Random selection to get unique combinations
      const jobIndex = Math.floor(Math.random() * jobs.length);
      const seekerIndex = Math.floor(Math.random() * jobSeekers.length);

      const job = jobs[jobIndex];
      const jobSeeker = jobSeekers[seekerIndex];
      const combinationKey = `${job._id}-${jobSeeker._id}`;

      // Skip if this combination already exists
      if (usedCombinations.has(combinationKey)) {
        continue;
      }

      usedCombinations.add(combinationKey);

      const jobSeekerProfile = jobSeekerProfiles[seekerIndex];
      const status = applicationStatuses[totalApplications % applicationStatuses.length];
      const coverLetter = coverLetters[totalApplications % coverLetters.length];

      const appliedDate = daysAgo(day);

      const appDoc = {
        job: job._id,
        jobSeeker: jobSeeker._id,
        employer: job.employer,
        status: status,
        coverLetter: { text: coverLetter },
        profileSnapshot: {
          firstName: jobSeekerProfile.firstName,
          lastName: jobSeekerProfile.lastName,
          skills: jobSeekerProfile.skills.slice(0, 3)
        },
        statusHistory: [{ status: status, changedAt: appliedDate }],
        createdAt: appliedDate,
        updatedAt: appliedDate
      };

      // Add interview data for interview status
      if (status === 'interview') {
        appDoc.interview = {
          scheduledDate: daysAgo(Math.max(0, day - 7)),
          location: totalApplications % 2 === 0 ? 'Video Call' : 'On-site',
          status: day > 7 ? 'completed' : 'scheduled'
        };
      }

      await Application.collection.insertOne(appDoc);
      createdForDay++;
      totalApplications++;
    }
  }

  console.log(`Applications created: ${totalApplications} with varied dates.`);

  // ==================== TRAINING COURSES ====================
  console.log('Creating training courses...');

  await TrainingCourse.create([
    {
      trainingCenter: trainingCenters[0]._id,
      trainingCenterProfile: trainingCenterProfiles[0]._id,
      title: 'Full Stack Web Development Bootcamp',
      description: 'Intensive 12-week program covering HTML, CSS, JavaScript, React, Node.js, and MongoDB.',
      category: 'Programming & Development',
      skillsTaught: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB', 'Git'],
      level: 'beginner',
      duration: { value: 12, unit: 'weeks' },
      mode: 'hybrid',
      schedule: 'Mon-Fri 9AM-5PM',
      price: { amount: 12000, currency: 'USD', isFree: false },
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-04-25'),
      enrollmentDeadline: new Date('2025-01-25'),
      maxParticipants: 25,
      enrolledCount: 18,
      certification: { offered: true, name: 'Full Stack Developer Certificate', issuedBy: 'Tech Academy' },
      status: 'published',
      rating: { average: 4.9, count: 125 }
    },
    {
      trainingCenter: trainingCenters[0]._id,
      trainingCenterProfile: trainingCenterProfiles[0]._id,
      title: 'Data Science with Python',
      description: 'Comprehensive data science program covering Python, statistics, and machine learning.',
      category: 'Data Science & Analytics',
      skillsTaught: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'SQL'],
      level: 'intermediate',
      duration: { value: 16, unit: 'weeks' },
      mode: 'online',
      schedule: 'Self-paced with weekly live sessions',
      price: { amount: 8000, currency: 'USD', isFree: false },
      startDate: new Date('2025-03-01'),
      enrollmentDeadline: new Date('2025-02-20'),
      maxParticipants: 40,
      enrolledCount: 12,
      certification: { offered: true, name: 'Data Science Professional Certificate', issuedBy: 'Tech Academy' },
      status: 'published',
      rating: { average: 4.7, count: 89 }
    },
    {
      trainingCenter: trainingCenters[0]._id,
      trainingCenterProfile: trainingCenterProfiles[0]._id,
      title: 'AWS Cloud Practitioner Certification Prep',
      description: 'Prepare for the AWS Cloud Practitioner exam.',
      category: 'Cloud Computing',
      skillsTaught: ['AWS', 'Cloud Architecture', 'EC2', 'S3', 'IAM', 'VPC'],
      level: 'beginner',
      duration: { value: 4, unit: 'weeks' },
      mode: 'online',
      schedule: 'Self-paced',
      price: { amount: 500, currency: 'USD', isFree: false },
      startDate: new Date('2025-01-15'),
      maxParticipants: 100,
      enrolledCount: 45,
      certification: { offered: true, name: 'AWS Cloud Practitioner Ready', issuedBy: 'Tech Academy' },
      status: 'published',
      rating: { average: 4.6, count: 210 }
    },
    {
      trainingCenter: trainingCenters[1]._id,
      trainingCenterProfile: trainingCenterProfiles[1]._id,
      title: 'PMP Certification Bootcamp',
      description: 'Comprehensive preparation for the PMP certification exam.',
      category: 'Project Management',
      skillsTaught: ['Project Planning', 'Risk Management', 'Stakeholder Management', 'Agile', 'Scrum'],
      level: 'advanced',
      duration: { value: 5, unit: 'days' },
      mode: 'in-person',
      schedule: 'Mon-Fri 9AM-6PM',
      price: { amount: 2500, currency: 'USD', isFree: false },
      startDate: new Date('2025-02-10'),
      endDate: new Date('2025-02-14'),
      enrollmentDeadline: new Date('2025-02-03'),
      maxParticipants: 20,
      enrolledCount: 15,
      certification: { offered: true, name: 'PMP Exam Ready Certificate', issuedBy: 'SkillsBoost Institute' },
      status: 'published',
      rating: { average: 4.8, count: 156 }
    },
    {
      trainingCenter: trainingCenters[1]._id,
      trainingCenterProfile: trainingCenterProfiles[1]._id,
      title: 'Business Analysis Fundamentals',
      description: 'Learn core business analysis techniques.',
      category: 'Business & Management',
      skillsTaught: ['Requirements Analysis', 'Process Mapping', 'Use Cases', 'User Stories'],
      level: 'beginner',
      duration: { value: 8, unit: 'weeks' },
      mode: 'hybrid',
      schedule: 'Tue & Thu 6PM-9PM',
      price: { amount: 1800, currency: 'USD', isFree: false },
      startDate: new Date('2025-02-18'),
      maxParticipants: 30,
      enrolledCount: 8,
      certification: { offered: true, name: 'Business Analysis Foundation Certificate', issuedBy: 'SkillsBoost Institute' },
      status: 'published',
      rating: { average: 4.5, count: 78 }
    },
    {
      trainingCenter: trainingCenters[0]._id,
      trainingCenterProfile: trainingCenterProfiles[0]._id,
      title: 'Introduction to Cybersecurity',
      description: 'Free introductory course covering cybersecurity basics.',
      category: 'Cybersecurity',
      skillsTaught: ['Network Security', 'Threat Analysis', 'Security Best Practices', 'Encryption'],
      level: 'beginner',
      duration: { value: 20, unit: 'hours' },
      mode: 'online',
      schedule: 'Self-paced',
      price: { amount: 0, currency: 'USD', isFree: true },
      maxParticipants: 500,
      enrolledCount: 234,
      certification: { offered: true, name: 'Cybersecurity Awareness Certificate', issuedBy: 'Tech Academy' },
      status: 'published',
      rating: { average: 4.4, count: 312 }
    }
  ]);

  console.log('Training courses created.');

  // Summary
  console.log('\n========== SEED DATA COMPLETE ==========');
  console.log('\nTest Accounts (all passwords: Test1234!):');
  console.log('\n--- Admin ---');
  console.log('Email: admin@jobagency.com');
  console.log('\n--- Job Seekers (10 users) ---');
  console.log('Email: john.doe@email.com');
  console.log('Email: jane.smith@email.com');
  console.log('Email: mike.wilson@email.com');
  console.log('Email: sarah.johnson@email.com');
  console.log('Email: alex.chen@email.com');
  console.log('Email: emma.davis@email.com');
  console.log('Email: david.kim@email.com');
  console.log('Email: lisa.wang@email.com');
  console.log('Email: chris.taylor@email.com');
  console.log('Email: amy.martinez@email.com');
  console.log('\n--- Employers (3 companies) ---');
  console.log('Email: hr@techcorp.com (TechCorp Solutions)');
  console.log('Email: hiring@innovate.io (Innovate.io)');
  console.log('Email: careers@globalfinance.com (Global Finance Group)');
  console.log('\n--- Training Centers (2 centers) ---');
  console.log('Email: info@techacademy.com (Tech Academy)');
  console.log('Email: contact@skillsboost.com (SkillsBoost Institute)');
  console.log('\n--- Data Summary ---');
  console.log('Users: 16 (spread over 6 months)');
  console.log('Jobs: 55 (spread over 3 months with multiple per day)');
  console.log('Applications: 117 (spread over 3 months with multiple per day)');
  console.log('Courses: 6');
  console.log('\n========================================\n');
};

// Main function
const main = async () => {
  await connectDB();
  await clearData();
  await seedData();
  await mongoose.connection.close();
  console.log('Database connection closed.');
  process.exit(0);
};

main().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
