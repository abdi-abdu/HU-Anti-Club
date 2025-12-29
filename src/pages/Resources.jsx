import React, { useState, useEffect } from 'react';
import { Download, FileText, Video, BookOpen, ExternalLink, Lock } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const resourcesQuery = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
        const resourcesSnapshot = await getDocs(resourcesQuery);
        setResources(resourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const getFileIcon = (fileName) => {
    if (!fileName) return FileText;
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return FileText;
      case 'mp4':
      case 'avi':
      case 'mov':
        return Video;
      default:
        return FileText;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const publicResources = [
    {
      title: 'Drug Awareness Handbook',
      description: 'Comprehensive guide to understanding different types of drugs and their effects.',
      type: 'PDF',
      size: '2.5 MB',
      category: 'Education'
    },
    {
      title: 'Prevention Strategies Guide',
      description: 'Evidence-based strategies for preventing substance abuse among students.',
      type: 'PDF',
      size: '1.8 MB',
      category: 'Prevention'
    },
    {
      title: 'Campus Support Services',
      description: 'Directory of all available support services at Haramaya University.',
      type: 'PDF',
      size: '1.2 MB',
      category: 'Support'
    },
    {
      title: 'Healthy Coping Mechanisms',
      description: 'Learn healthy ways to cope with stress and academic pressure.',
      type: 'PDF',
      size: '900 KB',
      category: 'Wellness'
    }
  ];

  const externalLinks = [
    {
      title: 'National Institute on Drug Abuse (NIDA)',
      description: 'Research-based information on drug abuse and addiction.',
      url: 'https://www.drugabuse.gov/',
      category: 'Research'
    },
    {
      title: 'SAMHSA National Helpline',
      description: '24/7 treatment referral and information service.',
      url: 'https://www.samhsa.gov/find-help/national-helpline',
      category: 'Support'
    },
    {
      title: 'Partnership to End Addiction',
      description: 'Resources for families and individuals affected by addiction.',
      url: 'https://drugfree.org/',
      category: 'Family Support'
    },
    {
      title: 'Substance Abuse Prevention',
      description: 'CDC resources on substance abuse prevention.',
      url: 'https://www.cdc.gov/substance-abuse/',
      category: 'Prevention'
    }
  ];

  const isAuthenticated = currentUser && userProfile?.status === 'active';

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-6 text-white" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Resource Center</h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Access educational materials, research papers, and support resources 
              for drug awareness and prevention.
            </p>
          </div>
        </div>
      </section>

      {/* Authentication Notice */}
      {!isAuthenticated && (
        <section className="py-8 bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center text-yellow-800">
              <Lock className="h-5 w-5 mr-2" />
              <span className="font-medium">
                {!currentUser 
                  ? 'Please log in to access premium resources and downloads.'
                  : 'Your account is pending approval. Premium resources will be available once approved.'
                }
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Public Resources */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Public Resources</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Free educational materials available to everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publicResources.map((resource, index) => {
              const IconComponent = getFileIcon(resource.title);
              return (
                <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-100 rounded-lg p-3 flex-shrink-0">
                      <IconComponent className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {resource.category}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{resource.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {resource.type} • {resource.size}
                        </div>
                        <button className="btn-primary text-sm flex items-center">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Member Resources */}
      {isAuthenticated && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Member Resources</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Exclusive resources available to approved club members.
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="card p-6 animate-pulse">
                    <div className="flex items-start space-x-4">
                      <div className="bg-gray-200 rounded-lg p-3 w-12 h-12"></div>
                      <div className="flex-grow">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-3"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No resources available</h3>
                <p className="text-gray-600">
                  Member resources will be added by administrators soon.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {resources.map((resource) => {
                  const IconComponent = getFileIcon(resource.title);
                  return (
                    <div key={resource.id} className="card p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start space-x-4">
                        <div className="bg-secondary-100 rounded-lg p-3 flex-shrink-0">
                          <IconComponent className="h-6 w-6 text-secondary-600" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
                          <p className="text-gray-600 mb-3">{resource.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              Added {formatDate(resource.createdAt)}
                            </div>
                            <button className="btn-secondary text-sm flex items-center">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* External Links */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">External Resources</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Trusted external organizations and resources for additional support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {externalLinks.map((link, index) => (
              <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-lg p-3 flex-shrink-0">
                    <ExternalLink className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{link.title}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {link.category}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{link.description}</p>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
                    >
                      Visit Website
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Need More Help?</h2>
          <p className="text-xl mb-8">
            Can't find what you're looking for? Our team is here to help you find the right resources.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/help" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Get Support
            </a>
            <a href="/register" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors">
              Join Our Club
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Resources;