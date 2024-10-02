import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-black text-white py-8">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Company Information */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-green-400">UrbanVista</h3>
          <p className="text-sm text-gray-400">
            UrbanVista (UV) provides cutting-edge solutions using AI to help people gain better insights 
            into weather conditions and urban environments. Join us in our mission to save the planet!
          </p>
        </div>

        {/* Useful Links */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-blue-400">Useful Links</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#about" className="hover:text-blue-500 transition-colors">About Us</a></li>
            <li><a href="#weather" className="hover:text-blue-500 transition-colors">Weather</a></li>
            <li><a href="#geo-dashboard" className="hover:text-blue-500 transition-colors">Data</a></li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-green-400">Follow Us</h3>
          <div className="flex space-x-4">
            <a href="https://facebook.com" aria-label="Facebook" className="text-gray-400 hover:text-blue-500 transition-colors">
              <Facebook size={24} />
            </a>
            <a href="https://twitter.com" aria-label="Twitter" className="text-gray-400 hover:text-blue-400 transition-colors">
              <Twitter size={24} />
            </a>
            <a href="https://instagram.com" aria-label="Instagram" className="text-gray-400 hover:text-pink-500 transition-colors">
              <Instagram size={24} />
            </a>
            <a href="https://linkedin.com" aria-label="LinkedIn" className="text-gray-400 hover:text-blue-600 transition-colors">
              <Linkedin size={24} />
            </a>
          </div>
        </div>
      </div>

      {/* Increase the gap here */}
      <div className="mt-12 text-center text-sm text-gray-500">
        © 2024 UrbanVista. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
