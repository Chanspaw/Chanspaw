import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Image, 
  Globe, 
  Edit, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Eye,
  Upload,
  Settings,
  BookOpen,
  HelpCircle,
  Newspaper,
  Shield,
  Users,
  Languages,
  Calendar,
  Tag,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  priority: number;
  language: string;
}

interface GameRule {
  id: string;
  gameName: string;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  lastUpdated: string;
  language: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  order: number;
  language: string;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  publishDate: string;
  isPublished: boolean;
  tags: string[];
  imageUrl: string;
  language: string;
}

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  version: string;
  lastUpdated: string;
  isActive: boolean;
  language: string;
}

interface Language {
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
}

export function ContentManagement() {
  const [activeTab, setActiveTab] = useState<'banners' | 'rules' | 'faq' | 'blog' | 'legal' | 'languages'>('banners');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'banner' | 'rule' | 'faq' | 'blog' | 'legal'>('banner');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Remove hardcoded languages - load from API only
  const [languages, setLanguages] = useState<Language[]>([]);

  // Real data from API
  const [banners, setBanners] = useState<Banner[]>([]);
  const [gameRules, setGameRules] = useState<GameRule[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);

  useEffect(() => {
    loadContentData();
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/content/languages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLanguages(data.languages || data || []);
      } else {
        setLanguages([]);
      }
    } catch (error) {
      console.error('Error loading languages:', error);
      setLanguages([]);
    }
  };

  const loadContentData = async () => {
    try {
      // Load banners from real API
      const bannersResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content/banners', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (bannersResponse.ok) {
        const bannersData = await bannersResponse.json();
        setBanners(bannersData.data?.banners || bannersData.banners || []);
      } else {
        console.error('Failed to load banners:', bannersResponse.status);
        setBanners([]);
      }

      // Load game rules from real API
      const rulesResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content/rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setGameRules(rulesData.data?.rules || rulesData.rules || []);
      } else {
        console.error('Failed to load game rules:', rulesResponse.status);
        setGameRules([]);
      }

      // Load FAQs from real API
      const faqsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content/faqs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (faqsResponse.ok) {
        const faqsData = await faqsResponse.json();
        setFaqs(faqsData.data?.faqs || faqsData.faqs || []);
      } else {
        console.error('Failed to load FAQs:', faqsResponse.status);
        setFaqs([]);
      }

      // Load blog posts from real API
      const blogResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content/blog', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (blogResponse.ok) {
        const blogData = await blogResponse.json();
        setBlogPosts(blogData.data?.posts || blogData.posts || []);
      } else {
        console.error('Failed to load blog posts:', blogResponse.status);
        setBlogPosts([]);
      }

      // Load legal documents from real API
      const legalResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content/legal', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (legalResponse.ok) {
        const legalData = await legalResponse.json();
        setLegalDocuments(legalData.data?.documents || legalData.documents || []);
      } else {
        console.error('Failed to load legal documents:', legalResponse.status);
        setLegalDocuments([]);
      }
    } catch (error) {
      console.error('Error loading content data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = (type: 'banner' | 'rule' | 'faq' | 'blog' | 'legal') => {
    setModalType(type);
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: any, type: 'banner' | 'rule' | 'faq' | 'blog' | 'legal') => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = (id: string, type: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      console.log(`Deleting ${type} with id: ${id}`);
    }
  };

  const handleSave = (data: any) => {
    console.log('Saving:', data);
    setShowModal(false);
  };

  const renderBannersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Homepage Banners</h3>
        <button
          onClick={() => handleAddNew('banner')}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Banner</span>
        </button>
      </div>

      <div className="text-center py-12">
        <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No Banners Yet</h3>
        <p className="text-gray-400 mb-4">Create your first homepage banner to engage users</p>
        <button
          onClick={() => handleAddNew('banner')}
          className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:opacity-90 flex items-center space-x-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create First Banner</span>
        </button>
      </div>
    </div>
  );

  const renderRulesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Game Rules & FAQ</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => handleAddNew('rule')}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Rule</span>
          </button>
          <button
            onClick={() => handleAddNew('faq')}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add FAQ</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-gaming-accent" />
            Game Rules
          </h4>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400">No game rules yet</p>
          </div>
        </div>

        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <HelpCircle className="h-5 w-5 mr-2 text-gaming-gold" />
            Frequently Asked Questions
          </h4>
          <div className="text-center py-8">
            <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400">No FAQs yet</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBlogTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Blog & News</h3>
        <button
          onClick={() => handleAddNew('blog')}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Post</span>
        </button>
      </div>

      <div className="text-center py-12">
        <Newspaper className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No Blog Posts Yet</h3>
        <p className="text-gray-400 mb-4">Start sharing news and updates with your community</p>
        <button
          onClick={() => handleAddNew('blog')}
          className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:opacity-90 flex items-center space-x-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Write First Post</span>
        </button>
      </div>
    </div>
  );

  const renderLegalTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Legal Documents</h3>
        <button
          onClick={() => handleAddNew('legal')}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Document</span>
        </button>
      </div>

      <div className="text-center py-12">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No Legal Documents</h3>
        <p className="text-gray-400 mb-4">Add terms of service, privacy policy, and other legal documents</p>
        <button
          onClick={() => handleAddNew('legal')}
          className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:opacity-90 flex items-center space-x-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add First Document</span>
        </button>
      </div>
    </div>
  );

  const renderLanguagesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Language Management</h3>
        <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Language</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {languages.map((lang) => (
          <div key={lang.code} className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Globe className="h-6 w-6 text-gaming-accent" />
                <div>
                  <h4 className="text-white font-medium">{lang.name}</h4>
                  <p className="text-gray-400 text-sm">{lang.code.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`px-2 py-1 rounded text-xs ${lang.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {lang.isActive ? 'Active' : 'Inactive'}
                </span>
                {lang.isDefault && (
                  <span className="px-2 py-1 rounded text-xs bg-gaming-gold/20 text-gaming-gold">
                    Default
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="flex-1 bg-gaming-accent text-white px-3 py-2 rounded text-sm hover:opacity-90">
                <Edit className="h-3 w-3" />
              </button>
              <button className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:opacity-90">
                <Settings className="h-3 w-3" />
              </button>
              {!lang.isDefault && (
                <button className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:opacity-90">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
        <h4 className="text-white font-medium mb-4">Translation Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">100%</div>
            <div className="text-gray-400 text-sm">English</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">75%</div>
            <div className="text-gray-400 text-sm">French</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">45%</div>
            <div className="text-gray-400 text-sm">Haitian Creole</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Content Management</h1>
        <div className="flex items-center space-x-3">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
          >
            {languages.filter(l => l.isActive).map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.code.toUpperCase()})
              </option>
            ))}
          </select>
          <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Content</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gaming-dark rounded-lg p-1 border border-gray-700">
        <div className="flex space-x-1">
          {[
            { id: 'banners', label: 'Banners', icon: Image },
            { id: 'rules', label: 'Rules & FAQ', icon: BookOpen },
            { id: 'blog', label: 'Blog', icon: Newspaper },
            { id: 'legal', label: 'Legal', icon: Shield },
            { id: 'languages', label: 'Languages', icon: Languages }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gaming-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
        {activeTab === 'banners' && renderBannersTab()}
        {activeTab === 'rules' && renderRulesTab()}
        {activeTab === 'blog' && renderBlogTab()}
        {activeTab === 'legal' && renderLegalTab()}
        {activeTab === 'languages' && renderLanguagesTab()}
      </div>

      {/* Modal for adding/editing content */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gaming-dark rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingItem ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Language
                </label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent">
                  {languages.filter(l => l.isActive).map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                  placeholder={`Enter ${modalType} title...`}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Content
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                  placeholder={`Enter ${modalType} content...`}
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-gray-300 text-sm">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave({})}
                className="bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
