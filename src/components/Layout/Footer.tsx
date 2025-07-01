import React, { useState, useEffect } from 'react';
import { Heart, Shield, Users, FileText, Mail, Phone, MapPin, Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface FooterSection {
  id: string;
  title: string;
  content: string;
  type: 'policy' | 'contact' | 'social' | 'legal';
  order: number;
}

interface FooterData {
  sections: FooterSection[];
  lastUpdated: string;
  version: string;
}

export function Footer() {
  return (
    <footer className="bg-gaming-darker border-t border-gray-700 mt-auto">
      <div className="container-mobile">
        <div className="py-4 sm:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Company Info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs sm:text-sm">C</span>
                </div>
                <h3 className="text-white font-bold text-sm sm:text-base">Chanspaw</h3>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                Premium gaming platform for competitive players
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm sm:text-base">Quick Links</h4>
              <ul className="space-y-1">
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Games</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Leaderboard</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Support</a></li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm sm:text-base">Support</h4>
              <ul className="space-y-1">
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Terms of Service</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm sm:text-base">Legal</h4>
              <ul className="space-y-1">
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Terms of Use</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-4 sm:mt-6 pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
              <p className="text-gray-400 text-xs sm:text-sm">
                © 2025 Chanspaw. All rights reserved.
              </p>
              <div className="flex items-center space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-600 rounded"></div>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Discord</span>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-600 rounded"></div>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">YouTube</span>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-600 rounded"></div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 