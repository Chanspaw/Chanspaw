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
  const [activeTab, setActiveTab] = useState<'banners' | 'announcements' | 'header' | 'footer' | 'rules' | 'blog' | 'legal' | 'languages'>('banners');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'banner' | 'rule' | 'faq' | 'blog' | 'legal' | 'announcement' | 'header' | 'footer'>('banner');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalForm, setModalForm] = useState<any>({});

  // Remove hardcoded languages - load from API only
  const [languages, setLanguages] = useState<Language[]>([]);

  // Real data from API
  const [banners, setBanners] = useState<Banner[]>([]);
  const [gameRules, setGameRules] = useState<GameRule[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);
  // Add Announcements, Header, Footer to tabs
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [headerContent, setHeaderContent] = useState<any[]>([]);
  const [footerContent, setFooterContent] = useState<any[]>([]);

  useEffect(() => {
    loadContentData();
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      // If languages are stored as content type, fetch with type=language
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=language', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLanguages(data.data?.contents || data.contents || []);
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
      // Load banners
      const bannersResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=banner', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (bannersResponse.ok) {
        const bannersData = await bannersResponse.json();
        setBanners(bannersData.data?.contents || bannersData.contents || []);
      } else {
        setBanners([]);
      }
      // Load game rules
      const rulesResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=rule', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setGameRules(rulesData.data?.contents || rulesData.contents || []);
      } else {
        setGameRules([]);
      }
      // Load FAQs
      const faqsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=faq', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (faqsResponse.ok) {
        const faqsData = await faqsResponse.json();
        setFaqs(faqsData.data?.contents || faqsData.contents || []);
      } else {
        setFaqs([]);
      }
      // Load blog posts
      const blogResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=blog', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (blogResponse.ok) {
        const blogData = await blogResponse.json();
        setBlogPosts(blogData.data?.contents || blogData.contents || []);
      } else {
        setBlogPosts([]);
      }
      // Load legal documents
      const legalResponse = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=legal', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (legalResponse.ok) {
        const legalData = await legalResponse.json();
        setLegalDocuments(legalData.data?.contents || legalData.contents || []);
      } else {
        setLegalDocuments([]);
      }
      // Announcements
      const annRes = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=announcement', { headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`, 'Content-Type': 'application/json' } });
      let annData = [];
      if (annRes.ok) {
        const json = await annRes.json();
        annData = json.data?.contents || json.contents || [];
      }
      setAnnouncements(annData);
      // Header
      const headerRes = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=header', { headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`, 'Content-Type': 'application/json' } });
      let headerData = [];
      if (headerRes.ok) {
        const json = await headerRes.json();
        headerData = json.data?.contents || json.contents || [];
      }
      setHeaderContent(headerData);
      // Footer
      const footerRes = await fetch(import.meta.env.VITE_API_URL + '/api/content?type=footer', { headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`, 'Content-Type': 'application/json' } });
      let footerData = [];
      if (footerRes.ok) {
        const json = await footerRes.json();
        footerData = json.data?.contents || json.contents || [];
      }
      setFooterContent(footerData);
    } catch (error) {
      console.error('Error loading content data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = (type: 'banner' | 'rule' | 'faq' | 'blog' | 'legal' | 'announcement' | 'header' | 'footer') => {
    openModal(type);
  };

  const handleEdit = (item: any, type: 'banner' | 'rule' | 'faq' | 'blog' | 'legal' | 'announcement' | 'header' | 'footer') => {
    openModal(type, item);
  };

  const handleDelete = async (id: string, type: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/content/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        loadContentData();
      } else {
        alert('Failed to delete content');
      }
    } catch (e) {
      alert('Error deleting content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `${import.meta.env.VITE_API_URL}/api/content/${editingItem.id}` : `${import.meta.env.VITE_API_URL}/api/content`;
      let contentValue = modalForm.content;
      if (!contentValue) {
        if (modalForm.body) contentValue = modalForm.body;
        else if (modalForm.description) contentValue = modalForm.description;
        else if (modalForm.text) contentValue = modalForm.text;
      }
      const body = JSON.stringify({
        ...modalForm,
        content: contentValue,
        type: modalType,
        status: modalForm.status || (modalForm.isActive ? 'active' : 'inactive') || 'active',
      });
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      if (res.ok) {
        loadContentData();
        setShowModal(false);
      } else {
        alert('Failed to save content');
      }
    } catch (e) {
      alert('Error saving content');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: any = value;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      fieldValue = e.target.checked;
    }
    setModalForm((prev: any) => ({
      ...prev,
      [name]: fieldValue
    }));
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-medium">{banner.title}</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(banner, 'banner')}
                  className="text-gray-400 hover:text-white"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(banner.id, 'banner')}
                  className="text-red-500 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4">{banner.description}</p>
            <p className="text-gray-400 text-sm">Language: {banner.language}</p>
            <p className="text-gray-400 text-sm">Status: {banner.isActive ? 'Active' : 'Inactive'}</p>
            <p className="text-gray-400 text-sm">Priority: {banner.priority}</p>
            <p className="text-gray-400 text-sm">Start Date: {new Date(banner.startDate).toLocaleDateString()}</p>
            <p className="text-gray-400 text-sm">End Date: {new Date(banner.endDate).toLocaleDateString()}</p>
            <p className="text-gray-400 text-sm">Link: <a href={banner.link} target="_blank" rel="noopener noreferrer" className="text-gaming-accent hover:underline">{banner.link}</a></p>
          </div>
        ))}
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

  const renderAnnouncementsTab = () => (
    <div> {/* Render announcements list and add/edit/delete buttons */} </div>
  );
  const renderHeaderTab = () => (
    <div> {/* Render header content and add/edit/delete buttons */} </div>
  );
  const renderFooterTab = () => (
    <div> {/* Render footer content and add/edit/delete buttons */} </div>
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

  const openModal = (type: any, item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setModalForm(item ? { ...item } : {});
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-card-gradient text-white">
      <div className="p-6">
        <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700 mb-6">
          <h1 className="text-2xl font-bold text-gaming-accent">Content Management</h1>
          <div className="flex items-center space-x-3 mt-4">
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
        <div className="bg-gaming-dark rounded-lg p-1 border border-gray-700 mb-6">
          <div className="flex space-x-1">
            {[
              { id: 'banners', label: 'Banners', icon: Image },
              { id: 'announcements', label: 'Announcements', icon: AlertCircle },
              { id: 'header', label: 'Header', icon: Globe },
              { id: 'footer', label: 'Footer', icon: FileText },
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
          {activeTab === 'announcements' && renderAnnouncementsTab()}
          {activeTab === 'header' && renderHeaderTab()}
          {activeTab === 'footer' && renderFooterTab()}
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
              <form
                onSubmit={e => { e.preventDefault(); handleSave(); }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Language</label>
                  <select
                    name="language"
                    value={modalForm.language || selectedLanguage}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                  >
                    {languages.filter(l => l.isActive).map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={modalForm.title || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                    placeholder={`Enter ${modalType} title...`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Content</label>
                  <textarea
                    name="content"
                    rows={6}
                    value={modalForm.content || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                    placeholder={`Enter ${modalType} content...`}
                    required
                  />
                </div>
                {(modalType === 'banner' || modalType === 'announcement') && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Image URL</label>
                      <input
                        type="text"
                        name="mediaUrl"
                        value={modalForm.mediaUrl || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                        placeholder="Enter image URL..."
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Link</label>
                      <input
                        type="text"
                        name="link"
                        value={modalForm.link || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                        placeholder="Enter link URL..."
                      />
                    </div>
                  </>
                )}
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={modalForm.isActive !== false}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-300 text-sm">Active</span>
                  </label>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
