import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, BookOpen, Heart, ArrowRight, Bell } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getTypeConfig } from './Admin/Announcements';

const Home = () => {
  const [recentEvents,        setRecentEvents]        = useState([]);
  const [recentPosts,         setRecentPosts]         = useState([]);
  const [announcements,       setAnnouncements]       = useState([]);
  const [loading,             setLoading]             = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent published events — fetch all then filter/sort client-side
        // to avoid composite index requirement (status + createdAt)
        const eventsSnapshot = await getDocs(
          query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(20))
        );
        const allEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentEvents(allEvents.filter(e => e.status === 'published').slice(0, 3));

        // Fetch recent posts
        const postsSnapshot = await getDocs(
          query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(3))
        );
        setRecentPosts(postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch published announcements — filter client-side to avoid index requirement
        try {
          const annSnapshot = await getDocs(
            query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(20))
          );
          const allAnn = annSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAnnouncements(allAnn.filter(a => a.published).slice(0, 5));
        } catch { /* announcements collection may not exist yet — silently skip */ }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { icon: Users, label: 'Active Members', value: '500+' },
    { icon: Calendar, label: 'Events Held', value: '50+' },
    { icon: BookOpen, label: 'Resources', value: '100+' },
    { icon: Heart, label: 'Lives Impacted', value: '1000+' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative text-white py-32 min-h-[600px] flex items-center"
        style={{
          backgroundImage: 'url(/images/hu-gate.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay so text stays readable over the photo */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center">
            <img src="/images/logo.png" alt="HU Anti-Drug Club Logo" className="h-16 w-16 mx-auto mb-6 drop-shadow-lg object-contain rounded-full" />
            <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
              Haramaya University
              <span className="block text-green-300">Anti-Drug Club</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-100 drop-shadow">
              Building a drug-free campus community through education, awareness, and support
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                Join Our Club
              </Link>
              <Link
                to="/help"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors shadow-lg"
              >
                Get Help Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Banner — only shown when there are published announcements */}
      {announcements.length > 0 && (
        <section className="bg-primary-50 border-b border-primary-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-800 mb-1">Announcements</p>
                <div className="space-y-2">
                  {announcements.map(ann => {
                    const typeCfg = getTypeConfig(ann.type);
                    return (
                      <div key={ann.id} className="flex items-start gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{ann.title}: </span>
                          <span className="text-sm text-gray-700">{ann.message}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Mission Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              To create a supportive environment where students can thrive academically and personally, 
              free from the harmful effects of drug abuse.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <stat.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</h3>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Events */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
            <Link to="/events" className="text-primary-600 hover:text-primary-700 font-medium flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentEvents.map((event) => (
                <div key={event.id} className="card p-6 hover:shadow-lg transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{event.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {event.date?.toDate?.()?.toLocaleDateString() || 'Date TBD'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Blog Posts */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Latest Articles</h2>
            <Link to="/blog" className="text-primary-600 hover:text-primary-700 font-medium flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentPosts.map((post) => (
                <div key={post.id} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="text-xs text-primary-600 font-medium mb-2 uppercase">
                    {post.category}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{post.content}</p>
                  <Link to={`/blog/${post.id}`} className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                    Read More →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Need Help or Support?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            We're here to support you. Reach out anonymously or connect with our counselors.
          </p>
          <Link to="/help" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Get Confidential Help
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;