import React, { useState } from 'react';
import { MessageCircle, Phone, Mail, Shield, Send, Heart } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';

const Help = () => {
  const [message, setMessage] = useState({
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setMessage({
      ...message,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'anonymousMessages'), {
        subject: message.subject,
        message: message.message,
        createdAt: serverTimestamp(),
        isReplied: false
      });

      toast.success('Your message has been sent anonymously. We will respond soon.');
      setMessage({ subject: '', message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const emergencyContacts = [
    {
      title: 'Campus Health Center',
      phone: '+251-25-553-0325',
      hours: '24/7 Emergency',
      description: 'Immediate medical assistance and crisis intervention'
    },
    {
      title: 'Student Counseling Services',
      phone: '+251-25-553-0326',
      hours: 'Mon-Fri 8AM-5PM',
      description: 'Professional counseling and mental health support'
    },
    {
      title: 'Campus Security',
      phone: '+251-25-553-0327',
      hours: '24/7',
      description: 'Campus safety and emergency response'
    },
    {
      title: 'National Drug Helpline',
      phone: '952',
      hours: '24/7 Free',
      description: 'National substance abuse helpline'
    }
  ];

  const resources = [
    {
      title: 'Substance Abuse Information',
      description: 'Learn about different types of drugs, their effects, and risks.',
      link: '/resources#substance-info'
    },
    {
      title: 'Recovery Resources',
      description: 'Find local treatment centers and recovery programs.',
      link: '/resources#recovery'
    },
    {
      title: 'Mental Health Support',
      description: 'Access mental health resources and coping strategies.',
      link: '/resources#mental-health'
    },
    {
      title: 'Academic Support',
      description: 'Get help maintaining your studies during recovery.',
      link: '/resources#academic'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-secondary-600 to-primary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Heart className="h-16 w-16 mx-auto mb-6 text-white" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">We're Here to Help</h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Confidential, judgment-free support for students facing challenges with substance abuse. 
              You're not alone in this journey.
            </p>
          </div>
        </div>
      </section>

      {/* Anonymous Message Form */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Shield className="h-12 w-12 mx-auto text-primary-600 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Send Anonymous Message</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Share your concerns, ask questions, or request help completely anonymously. 
              No personal information is required or stored.
            </p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  value={message.subject}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="What would you like help with?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={message.message}
                  onChange={handleChange}
                  className="input-field resize-none"
                  placeholder="Share your concerns, questions, or situation. Remember, this is completely anonymous and confidential."
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Your Privacy is Protected</p>
                    <p>
                      This message is completely anonymous. We don't collect IP addresses, 
                      browser information, or any identifying data. Our trained counselors 
                      will respond with general guidance and resources.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send Anonymous Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Emergency Contacts</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              If you're in immediate danger or need urgent help, contact these services directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-red-100 rounded-full p-3 flex-shrink-0">
                    <Phone className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{contact.title}</h3>
                    <p className="text-2xl font-bold text-red-600 mb-1">{contact.phone}</p>
                    <p className="text-sm text-gray-600 mb-2">{contact.hours}</p>
                    <p className="text-gray-700">{contact.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Helpful Resources</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Access educational materials, treatment information, and support resources.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((resource, index) => (
              <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
                <p className="text-gray-600 mb-4">{resource.description}</p>
                <a 
                  href={resource.link}
                  className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
                >
                  Learn More
                  <MessageCircle className="ml-1 h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support Message */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">You Are Not Alone</h2>
          <p className="text-xl mb-6">
            Recovery is possible, and seeking help is a sign of strength, not weakness. 
            Our community is here to support you every step of the way.
          </p>
          <div className="bg-white/10 rounded-lg p-6 max-w-2xl mx-auto">
            <p className="text-lg italic">
              "The first step towards getting somewhere is to decide you're not going to stay where you are."
            </p>
            <p className="text-sm mt-2 opacity-80">- J.P. Morgan</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Help;