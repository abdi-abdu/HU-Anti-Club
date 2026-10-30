import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, getDocs, where,
  Timestamp, doc, setDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Events = () => {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('upcoming');

  // map of eventId → { registered: bool, count: number, saving: bool }
  const [regState, setRegState] = useState({});

  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // ── fetch events ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const now = Timestamp.now();
        let eventsQuery;

        if (filter === 'upcoming') {
          eventsQuery = query(
            collection(db, 'events'),
            where('status', '==', 'published'),
            where('date', '>=', now),
            orderBy('date', 'asc')
          );
        } else {
          eventsQuery = query(
            collection(db, 'events'),
            where('status', '==', 'published'),
            where('date', '<', now),
            orderBy('date', 'desc')
          );
        }

        const snap = await getDocs(eventsQuery);
        const evList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEvents(evList);

        // for each event fetch registration count + whether current user registered
        if (evList.length > 0) {
          const stateMap = {};
          await Promise.all(evList.map(async (ev) => {
            const regCol = collection(db, 'events', ev.id, 'registrations');
            const regSnap = await getDocs(regCol);
            const count = regSnap.size;
            const registered = currentUser
              ? regSnap.docs.some(d => d.id === currentUser.uid)
              : false;
            stateMap[ev.id] = { registered, count, saving: false };
          }));
          setRegState(stateMap);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        // fallback — fetch all without date filter
        try {
          const fallbackQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
          const snap = await getDocs(fallbackQuery);
          setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error('Fallback also failed:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [filter, currentUser]);

  // ── register / unregister ───────────────────────────────────────────────────
  const handleRegister = async (eventId) => {
    if (!currentUser) {
      toast.error('Please log in to register for events');
      navigate('/login');
      return;
    }

    if (userProfile?.status !== 'active') {
      toast.error('Your account must be approved before registering for events');
      return;
    }

    const current = regState[eventId] || { registered: false, count: 0 };

    // optimistic UI update
    setRegState(prev => ({
      ...prev,
      [eventId]: { ...current, saving: true },
    }));

    try {
      const regRef = doc(db, 'events', eventId, 'registrations', currentUser.uid);

      if (current.registered) {
        // cancel registration
        await deleteDoc(regRef);
        setRegState(prev => ({
          ...prev,
          [eventId]: {
            registered: false,
            count: Math.max(0, current.count - 1),
            saving: false,
          },
        }));
        toast.success('Registration cancelled');
      } else {
        // register
        await setDoc(regRef, {
          userId:    currentUser.uid,
          fullName:  userProfile?.fullName  || currentUser.displayName || '',
          email:     currentUser.email,
          college:   userProfile?.college   || '',
          department:userProfile?.department|| '',
          registeredAt: new Date(),
        });
        setRegState(prev => ({
          ...prev,
          [eventId]: {
            registered: true,
            count: current.count + 1,
            saving: false,
          },
        }));
        toast.success('Successfully registered for this event!');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to update registration. Please try again.');
      // revert optimistic update
      setRegState(prev => ({
        ...prev,
        [eventId]: { ...current, saving: false },
      }));
    }
  };

  // ── formatters ──────────────────────────────────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return 'Date TBD';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatTime = (ts) => {
    if (!ts) return 'Time TBD';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-6 text-white" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Events & Campaigns</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">
            Join our awareness campaigns, educational workshops, and community events
            promoting a drug-free campus lifestyle.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="bg-white rounded-lg p-1 shadow-sm">
            {['upcoming', 'past'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-primary-600'
                }`}
              >
                {f === 'upcoming' ? 'Upcoming Events' : 'Past Events'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No {filter} events found
              </h3>
              <p className="text-gray-600">
                {filter === 'upcoming'
                  ? 'Check back soon for new events and campaigns!'
                  : 'No past events to display at this time.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event) => {
                const rs = regState[event.id] || { registered: false, count: 0, saving: false };
                return (
                  <div key={event.id} className="card overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    {/* event image */}
                    {event.imageUrl && (
                      <div className="h-48 bg-gray-200 overflow-hidden">
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}

                    <div className="p-6 flex flex-col flex-grow">
                      {/* date */}
                      <div className="flex items-center text-sm text-primary-600 mb-2">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(event.date)}
                      </div>

                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {event.title}
                      </h3>

                      <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">
                        {event.description}
                      </p>

                      {/* meta */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-2" />
                          {formatTime(event.date)}
                        </div>
                        {event.location && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        )}
                        {/* registration count */}
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-2" />
                          {rs.count} {rs.count === 1 ? 'person' : 'people'} registered
                        </div>
                      </div>

                      {/* Register button — only for upcoming events */}
                      {filter === 'upcoming' && (
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={() => handleRegister(event.id)}
                            disabled={rs.saving}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              rs.registered
                                ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600 border border-green-300 hover:border-red-300'
                                : 'btn-primary'
                            }`}
                          >
                            {rs.saving ? (
                              <span className="animate-pulse">Updating...</span>
                            ) : rs.registered ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Registered — Click to Cancel
                              </>
                            ) : (
                              <>
                                <Calendar className="h-4 w-4" />
                                Register Interest
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      {filter === 'upcoming' && (
        <section className="py-16 bg-primary-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Want to Get Involved?</h2>
            <p className="text-xl mb-8">
              Join our club to stay updated on all events and help organise awareness campaigns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/register" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Become a Member
              </a>
              <a href="/about" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors">
                Learn More
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Events;
