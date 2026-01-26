import React from 'react';
import { Shield, Target, Users, Heart, Award, BookOpen, User } from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: Shield,
      title: 'Prevention',
      description: 'Proactive education and awareness to prevent drug abuse before it starts.'
    },
    {
      icon: Heart,
      title: 'Support',
      description: 'Compassionate support for students struggling with substance abuse.'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Building a strong, supportive community of drug-free students.'
    },
    {
      icon: BookOpen,
      title: 'Education',
      description: 'Evidence-based education about the risks and consequences of drug use.'
    }
  ];

  const team = [
    {
      name: 'Dr. Alemayehu Tadesse',
      role: 'Faculty Advisor',
      department: 'College of Health and Medical Sciences',
      image: '/api/placeholder/150/150'
    },
    {
      name: 'Meron Bekele',
      role: 'Club President',
      department: 'College of Social Sciences and Humanities',
      image: '/api/placeholder/150/150'
    },
    {
      name: 'Dawit Haile',
      role: 'Vice President',
      department: 'College of Computing and Informatics',
      image: '/api/placeholder/150/150'
    },
    {
      name: 'Hanan Mohammed',
      role: 'Secretary',
      department: 'College of Business and Economics',
      image: '/api/placeholder/150/150'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About Our Club</h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Dedicated to creating a drug-free campus environment through education, 
              awareness, and unwavering support for all Haramaya University students.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="card p-8">
              <div className="flex items-center mb-6">
                <Target className="h-8 w-8 text-primary-600 mr-3" />
                <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed">
                To create a supportive, drug-free environment at Haramaya University where 
                students can thrive academically, socially, and personally. We are committed 
                to preventing substance abuse through comprehensive education, raising awareness 
                about the dangers of drug use, and providing confidential support to those in need.
              </p>
            </div>

            <div className="card p-8">
              <div className="flex items-center mb-6">
                <Award className="h-8 w-8 text-secondary-600 mr-3" />
                <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed">
                To be the leading student organization in Ethiopia that champions drug-free 
                living and creates a campus culture where every student feels empowered to 
                make healthy choices, pursue their academic goals, and contribute positively 
                to society without the influence of harmful substances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These values guide everything we do and shape our approach to supporting students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-md flex items-center justify-center">
                  <value.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What We Do</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4 text-primary-600">Educational Workshops</h3>
              <p className="text-gray-600">
                Regular workshops and seminars about drug awareness, health risks, 
                and the impact of substance abuse on academic and personal life.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4 text-primary-600">Peer Support Programs</h3>
              <p className="text-gray-600">
                Trained peer counselors provide confidential support and guidance 
                to students facing challenges with substance abuse.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4 text-primary-600">Awareness Campaigns</h3>
              <p className="text-gray-600">
                Campus-wide campaigns during key periods like orientation week 
                and exam periods to promote drug-free living.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4 text-primary-600">Resource Center</h3>
              <p className="text-gray-600">
                Comprehensive library of educational materials, research papers, 
                and resources about drug prevention and recovery.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4 text-primary-600">Anonymous Help Line</h3>
              <p className="text-gray-600">
                24/7 anonymous support system where students can seek help 
                without fear of judgment or academic consequences.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4 text-primary-600">Community Outreach</h3>
              <p className="text-gray-600">
                Extending our mission beyond campus to local communities 
                and secondary schools in the region.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Leadership Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Meet the dedicated individuals leading our mission to create a drug-free campus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="card p-6 text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-primary-600 font-medium mb-2">{member.role}</p>
                <p className="text-sm text-gray-600">{member.department}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Mission</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Be part of the change. Help us create a healthier, drug-free campus community 
            where every student can reach their full potential.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Become a Member
            </a>
            <a href="/help" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors">
              Get Support
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;