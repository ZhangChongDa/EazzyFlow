import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, User, Activity, Users, Loader2, Search, MapPin, Calendar, DollarSign, Wifi, Phone, AppWindow, Gift, Smartphone, Award, ShoppingBag, Sparkles, Loader2 as Loader2Icon, Clock, ArrowRight, CheckCircle, Radio, Target, Mail, MessageCircle, Globe, Send, Facebook, Linkedin, Instagram, Bell, Plus } from 'lucide-react';
import { Node } from '@xyflow/react';
import { SegmentCriteria, SegmentConditionGroup } from '../hooks/useAudienceEstimator';
import { useAudienceEstimator } from '../hooks/useAudienceEstimator';
import { Offer, Product, Coupon } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { useChatAssistant as useChatAssistantContext } from '../contexts/ChatAssistantContext';
import { useUserTags } from '../hooks/useUserTags';
import { useUserSegments } from '../hooks/useUserSegments';
import { AudienceBuilder } from './AudienceBuilder';

// Type definitions (matching CampaignCanvas.tsx)
type TriggerCondition = {
  id: string;
  field: string; // 'balance', 'data', 'arpu', 'location', 'app', etc.
  operator: string; // '<', '>', '=', 'contains', etc.
  value: string | number;
};

type TriggerConditionGroup = {
  id: string;
  conditions: TriggerCondition[];
  operator: 'AND' | 'OR'; // Within group operator
  groupOperator?: 'AND' | 'OR'; // Between groups operator (for next group)
};

type TriggerConditionItem = {
  id: string;
  category: 'topup' | 'data' | 'voice' | 'location' | 'app';
  operator?: string;
  threshold?: string | number;
  unit?: string;
  locationName?: string;
  radius?: string;
  appName?: string;
  appUrl?: string;
  relationToNext?: 'AND' | 'OR'; // Relation to next condition
};

type TriggerConfig = {
  // ✅ Opt-2: Multiple conditions (Topup, Data, Voice, Location, App) - Multi-select Toggle
  conditions?: TriggerConditionItem[];
  
  // ✅ Opt-2: Schedule is now required
  scheduleType?: 'specific' | 'ongoing'; // Required (default to 'ongoing' if not set)
  // Specific time schedule
  startDate?: string;
  endDate?: string;
  allDay?: boolean; // If true, all time in date range is valid
  specificTime?: boolean; // If true, use time windows
  dailyTimeStart?: string; // e.g., "19:00"
  dailyTimeEnd?: string; // e.g., "20:00"
  weeklyDays?: string[]; // e.g., ["Wednesday"] for weekly schedule
  weeklyTimeStart?: string;
  weeklyTimeEnd?: string;
  
  // Legacy fields (for backward compatibility - will be migrated)
  category?: 'topup' | 'data' | 'voice' | 'location' | 'app' | 'schedule';
  operator?: string;
  threshold?: string | number;
  unit?: string;
  locationName?: string;
  radius?: string;
  startTime?: string; // Legacy - use dailyTimeStart/weeklyTimeStart instead
  endTime?: string; // Legacy - use dailyTimeEnd/weeklyTimeEnd instead
  appName?: string;
  appUrl?: string;
  conditionGroups?: TriggerConditionGroup[]; // Legacy - will be removed
};

type ChannelContentData = {
  text?: string;
  subject?: string;
  image?: string;
};

type CampaignNodeData = {
  label: string;
  subLabel?: string;
  icon?: any;
  triggerConfig?: TriggerConfig;
  baseSegment?: string;
  segmentCriteria?: SegmentCriteria;
  audienceSize?: number;
  actionType?: string;
  offerCategory?: string;
  productId?: string;
  productName?: string;
  couponId?: string;
  couponName?: string;
  offerId?: string; // ✅ Category 2.1: Offer ID from offers table
  landingPageUrl?: string; // ✅ Category 2.1: Custom landing page URL fallback
  messageContent?: string;
  selectedChannels?: string[];
  channelContent?: Record<string, ChannelContentData>;
  aiContentTone?: string;
  branches?: any[];
  waitType?: 'duration' | 'date';
  durationValue?: number | string;
  durationUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  fixedDate?: string;
  enableWindow?: boolean;
  windowStart?: string;
  windowEnd?: string;
};

interface ConfigurationDrawerProps {
  node: Node | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, data: Partial<CampaignNodeData>) => void;
  products: Product[];
  coupons: Coupon[];
  offers: Offer[];
  nodes: Node[]; // For finding upstream nodes
}

// Mock data for autocomplete
const MOCK_TAGS = ['Gamer', 'Business', 'Student', 'Family', 'Senior', 'iPhone', 'Samsung', 'Android', 'iOS'];
const MOCK_LOCATIONS = ['Yangon Downtown', 'Mandalay Center', 'Nay Pyi Taw', 'Bago', 'Shan State'];
const MOCK_APPS = [
  { name: 'Mobile Legends', icon: Smartphone, url: 'mobilelegends://' },
  { name: 'TikTok', icon: Globe, url: 'tiktok://' },
  { name: 'YouTube', icon: Globe, url: 'youtube://' },
  { name: 'Facebook', icon: Facebook, url: 'facebook://' }
];

const CHANNEL_DEFS: Record<string, { label: string; icon: any; bgColor: string; color: string }> = {
  sms: { label: 'SMS', icon: MessageCircle, bgColor: 'bg-blue-50', color: 'text-blue-600' },
  email: { label: 'Email', icon: Mail, bgColor: 'bg-purple-50', color: 'text-purple-600' },
  facebook: { label: 'Facebook', icon: Facebook, bgColor: 'bg-blue-50', color: 'text-blue-600' },
  instagram: { label: 'Instagram', icon: Instagram, bgColor: 'bg-pink-50', color: 'text-pink-600' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, bgColor: 'bg-blue-50', color: 'text-blue-600' },
  chatbox: { label: 'Chat', icon: MessageCircle, bgColor: 'bg-green-50', color: 'text-green-600' },
  ussd: { label: 'USSD', icon: Phone, bgColor: 'bg-slate-50', color: 'text-slate-600' },
  push: { label: 'Push', icon: Bell, bgColor: 'bg-orange-50', color: 'text-orange-600' }
};

// ✅ Opt-7: App Usage Selector Component (from telecom_usage database)
const AppUsageSelector: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const [apps, setApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data, error } = await supabase
          .from('telecom_usage')
          .select('metadata')
          .not('metadata', 'is', null)
          .limit(1000);

        if (error) throw error;

        // Extract unique app names from metadata JSONB
        const appSet = new Set<string>();
        (data || []).forEach((record: any) => {
          try {
            const metadata = typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata;
            if (metadata?.app_name) {
              appSet.add(metadata.app_name);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        });

        setApps(Array.from(appSet).sort());
      } catch (err) {
        console.error('Failed to fetch apps:', err);
        // Fallback to mock apps
        setApps(['Mobile Legends', 'Facebook', 'TikTok', 'YouTube']);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, []);

  return (
    <select
      className="flex-1 min-w-[120px] px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      <option value="">Select App...</option>
      {apps.map(app => (
        <option key={app} value={app}>{app}</option>
      ))}
    </select>
  );
};

// ✅ Opt-8: User Tags Selector Component - Now uses database tags and segments
interface UserTagsSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  onSelectSegment?: (segmentCriteria: SegmentCriteria) => void; // ✅ New: Callback for Segment selection
}

const UserTagsSelector: React.FC<UserTagsSelectorProps> = ({ value, onChange, onSelectSegment }) => {
  const [tagInput, setTagInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLDivElement>(null);
  const { tags, loading: tagsLoading } = useUserTags();
  const { segments, loading: segmentsLoading } = useUserSegments();

  // Get available tags from database (filter out already selected ones)
  const availableTags = tags
    .map(t => t.name)
    .filter(t => !value.includes(t));

  // Get available segments (filter by search input)
  const filteredSegments = segments.filter(seg => 
    seg.name.toLowerCase().includes(tagInput.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(e.target as HTMLElement)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTag = (tag: string) => {
    onChange([...value, tag]);
    setTagInput('');
    setIsDropdownOpen(false);
  };

  const handleSelectSegment = (segment: any) => {
    if (onSelectSegment && segment.criteria) {
      // ✅ Apply Segment's criteria to the node
      onSelectSegment(segment.criteria);
      setTagInput('');
      setIsDropdownOpen(false);
    }
  };

  const hasResults = availableTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).length > 0 || filteredSegments.length > 0;

  return (
    <div ref={tagInputRef} className="flex-1 min-w-[120px] relative">
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map(tag => (
          <span key={tag} className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-indigo-900"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder="Search tags or segments..."
          className="w-full px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
          value={tagInput}
          onChange={(e) => {
            setTagInput(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
        />
        <Search className="absolute right-2 top-1.5 text-slate-400" size={12} />
      </div>
      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-indigo-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {(tagsLoading || segmentsLoading) ? (
            <div className="px-3 py-4 text-center text-slate-400 text-xs">
              <Loader2 className="animate-spin mx-auto mb-2" size={16} />
              Loading...
            </div>
          ) : hasResults ? (
            <>
              {/* ✅ Tags Section */}
              {availableTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Tags
                  </div>
                  {availableTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).map(tag => {
                    const tagData = tags.find(t => t.name === tag);
                    return (
                      <div
                        key={tag}
                        className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-xs text-slate-700 flex items-center gap-2"
                        onClick={() => handleSelectTag(tag)}
                      >
                        {tagData && (
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: tagData.color }}
                          />
                        )}
                        <span className="flex-1">{tag}</span>
                        <span className="text-[10px] text-slate-400">Tag</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ✅ Segments Section */}
              {filteredSegments.length > 0 && (
                <div>
                  {availableTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).length > 0 && (
                    <div className="border-t border-slate-200"></div>
                  )}
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Segments
                  </div>
                  {filteredSegments.map(segment => (
                    <div
                      key={segment.id}
                      className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-slate-700 flex items-center gap-2"
                      onClick={() => handleSelectSegment(segment)}
                    >
                      <Users size={14} className="text-purple-600" />
                      <span className="flex-1 font-medium">{segment.name}</span>
                      <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                        {segment.estimated_size?.toLocaleString() || 0} users
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-4 text-center text-slate-400 text-xs">
              No tags or segments found. Create them in Audience Studio.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ConfigurationDrawer: React.FC<ConfigurationDrawerProps> = ({
  node,
  onClose,
  onUpdateNode,
  products,
  coupons,
  offers,
  nodes
}) => {
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLDivElement>(null);
  const [appInput, setAppInput] = useState('');
  const [isAppDropdownOpen, setIsAppDropdownOpen] = useState(false);
  const appInputRef = useRef<HTMLDivElement>(null);
  const [locationInput, setLocationInput] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationInputRef = useRef<HTMLDivElement>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [activeChannelTab, setActiveChannelTab] = useState<string>('');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyUsers, setVerifyUsers] = useState<any[]>([]);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // ✅ LIFT HOOKS: Move useAudienceEstimator to top level (before early return)
  // Pass undefined if node is null or not a segment node
  const segmentCriteria = node?.type === 'segment' 
    ? (node.data as unknown as CampaignNodeData).segmentCriteria 
    : undefined;
  const { audienceSize, loading: estimatingAudience } = useAudienceEstimator(segmentCriteria);

  // ✅ Fix: Sync audienceSize to node data when it's calculated
  useEffect(() => {
    if (node?.type === 'segment' && audienceSize !== null && !estimatingAudience) {
      // Only update if the value has changed to avoid unnecessary re-renders
      const currentAudienceSize = (node.data as unknown as CampaignNodeData).audienceSize;
      if (currentAudienceSize !== audienceSize) {
        console.log(`[ConfigurationDrawer] Updating audienceSize for node ${node.id}: ${audienceSize}`);
        onUpdateNode(node.id, { audienceSize });
      }
    }
  }, [audienceSize, estimatingAudience, node?.id, node?.type]);

  // ✅ LIFT useEffect: Move to top level (before early return)
  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (tagInputRef.current && !tagInputRef.current.contains(target)) {
        setIsTagDropdownOpen(false);
      }
      if (appInputRef.current && !appInputRef.current.contains(target)) {
        setIsAppDropdownOpen(false);
      }
      if (locationInputRef.current && !locationInputRef.current.contains(target)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Opt-3: Auto-populate Channel copy from Segment + Action nodes
  // ✅ CRITICAL: This useEffect MUST be before the early return to maintain hooks order
  useEffect(() => {
    if (!node || node.type !== 'channel' || !nodes) return;
    
    const findUpstreamSegmentNode = (): Node | null => {
      if (node.type !== 'channel' || !nodes) return null;
      return nodes.find((n: Node) => n.type === 'segment') || null;
    };
    
    const findUpstreamActionNode = (): Node | null => {
      if (node.type !== 'channel' || !nodes) return null;
      return nodes.find((n: Node) => n.type === 'action') || null;
    };
    
    const upstreamSegment = findUpstreamSegmentNode();
    const upstreamAction = findUpstreamActionNode();
    
    if (upstreamAction) {
      const actionData = upstreamAction.data as unknown as CampaignNodeData;
      const offerName = actionData.productName || actionData.offerId || actionData.label || 'the offer';
      
      // Get Segment node label (node name)
      const segmentLabel = upstreamSegment 
        ? (upstreamSegment.data as unknown as CampaignNodeData).label || 'Exclusive Offer'
        : 'Exclusive Offer';
      
      const nodeData = node.data as unknown as CampaignNodeData;
      // ✅ Opt-3: Auto-populate each channel independently if empty
      const selectedChannels = nodeData.selectedChannels || ['sms', 'email', 'facebook'];
      const currentContent = nodeData.channelContent || {};
      const newContent = { ...currentContent };
      let hasUpdates = false;
      
      selectedChannels.forEach(ch => {
        // Only populate if content is empty or missing
        const existingContent = newContent[ch];
        if (!existingContent || !existingContent.text || existingContent.text.trim() === '') {
          hasUpdates = true;
          // ✅ Opt-3: SMS uses "Segment Label: Action Offer Name" format
          if (ch === 'sms') {
            newContent[ch] = {
              ...newContent[ch],
              text: `${segmentLabel}: ${offerName}`
            };
          } else {
            // Other channels use standard format
            newContent[ch] = {
              ...newContent[ch],
              text: `Special offer: ${offerName}. Limited time only!`
            };
          }
        }
      });
      
      // Only update if we have changes and offerName exists
      if (hasUpdates && offerName) {
        onUpdateNode(node.id, { channelContent: newContent });
      }
    }
  }, [node?.id, node?.type, nodes, onUpdateNode]); // Only run when node changes

  // ✅ Opt-2: Initialize Trigger Schedule if not set
  useEffect(() => {
    if (!node || node.type !== 'trigger') return;
    const nodeData = node.data as unknown as CampaignNodeData;
    if (!nodeData.triggerConfig?.scheduleType) {
      const currentConfig = nodeData.triggerConfig || {};
      onUpdateNode(node.id, {
        triggerConfig: { ...currentConfig, scheduleType: 'ongoing' }
      });
    }
  }, [node?.id, node?.type, onUpdateNode]);

  // ✅ Fix-2: Use ChatAssistant Context to open chat and generate copy
  // ✅ CRITICAL: This hook MUST be before the early return to maintain hooks order
  const { openChat, setOnResponseCallback } = useChatAssistantContext();

  // Early return AFTER all hooks
  if (!node) return null;

  const data = node.data as unknown as CampaignNodeData;

  // ✅ Find upstream Action node for Channel AI context
  const findUpstreamActionNode = (): Node | null => {
    if (node.type !== 'channel' || !nodes) return null;
    // Find the Action node that connects to this Channel node
    // In React Flow, we need to check edges to find upstream nodes
    // For now, we'll find the first Action node in the nodes array
    // TODO: In production, use ReactFlow's useReactFlow hook to get edges
    return nodes.find((n: Node) => n.type === 'action') || null;
  };

  const updateCriteria = (key: keyof SegmentCriteria, value: any) => {
    const currentCriteria = data.segmentCriteria || {};
    onUpdateNode(node.id, {
      segmentCriteria: { ...currentCriteria, [key]: value }
    });
  };

  const updateDeepCriteria = (parent: 'arpu' | 'balance', key: 'min' | 'max', value: string) => {
    const currentCriteria = data.segmentCriteria || {};
    const currentParent = currentCriteria[parent] || {};
    onUpdateNode(node.id, {
      segmentCriteria: {
        ...currentCriteria,
        [parent]: { ...currentParent, [key]: value }
      }
    });
  };

  const addTag = (tag: string) => {
    const currentTags = data.segmentCriteria?.tags || [];
    if (!currentTags.includes(tag)) {
      updateCriteria('tags', [...currentTags, tag]);
    }
    setTagInput('');
    setIsTagDropdownOpen(false);
  };

  const removeTag = (tag: string) => {
    const currentTags = data.segmentCriteria?.tags || [];
    updateCriteria('tags', currentTags.filter(t => t !== tag));
  };

  // ✅ Opt-2: Update Trigger Config helper
  const updateTriggerConfig = (updates: Partial<TriggerConfig>) => {
    const currentConfig = data.triggerConfig || { scheduleType: 'ongoing' };
    onUpdateNode(node.id, {
      triggerConfig: { ...currentConfig, ...updates }
    });
  };

  // ✅ Opt-2: Add condition to trigger
  const addTriggerCondition = (category: 'topup' | 'data' | 'voice' | 'location' | 'app') => {
    const currentConfig = data.triggerConfig || { scheduleType: 'ongoing', conditions: [] };
    const existingConditions = currentConfig.conditions || [];
    
    // Check if condition already exists
    if (existingConditions.some(c => c.category === category)) {
      return; // Already added
    }
    
    const newCondition: TriggerConditionItem = {
      id: `cond-${Date.now()}`,
      category,
      operator: category === 'topup' || category === 'data' || category === 'voice' ? '>' : undefined,
      threshold: category === 'topup' ? '1000' : category === 'data' ? '100' : category === 'voice' ? '60' : undefined,
      unit: category === 'topup' ? 'Ks' : category === 'data' ? 'MB' : category === 'voice' ? 'Mins' : undefined,
      relationToNext: existingConditions.length > 0 ? 'AND' : undefined
    };
    
    updateTriggerConfig({
      conditions: [...existingConditions, newCondition],
      scheduleType: currentConfig.scheduleType || 'ongoing'
    });
  };

  // ✅ Opt-2: Remove condition from trigger
  const removeTriggerCondition = (conditionId: string) => {
    const currentConfig = data.triggerConfig || { scheduleType: 'ongoing', conditions: [] };
    const existingConditions = currentConfig.conditions || [];
    const filtered = existingConditions.filter(c => c.id !== conditionId);
    
    // Update relationToNext for remaining conditions
    const updatedConditions = filtered.map((cond, idx) => ({
      ...cond,
      relationToNext: idx < filtered.length - 1 ? (cond.relationToNext || 'AND') : undefined
    }));
    
    updateTriggerConfig({ conditions: updatedConditions });
  };

  // ✅ Opt-2: Update condition
  const updateTriggerCondition = (conditionId: string, updates: Partial<TriggerConditionItem>) => {
    const currentConfig = data.triggerConfig || { scheduleType: 'ongoing', conditions: [] };
    const existingConditions = currentConfig.conditions || [];
    const updatedConditions = existingConditions.map(cond => 
      cond.id === conditionId ? { ...cond, ...updates } : cond
    );
    updateTriggerConfig({ conditions: updatedConditions });
  };

  const selectApp = (app: typeof MOCK_APPS[0], conditionId?: string) => {
    if (conditionId) {
      updateTriggerCondition(conditionId, { appName: app.name, appUrl: app.url });
    } else {
      // Legacy support
      updateTriggerConfig({ appName: app.name, appUrl: app.url });
    }
    setAppInput(app.name);
    setIsAppDropdownOpen(false);
  };

  const selectLocation = (loc: string, conditionId?: string) => {
    if (conditionId) {
      updateTriggerCondition(conditionId, { locationName: loc });
    } else {
      // Legacy support
      updateTriggerConfig({ locationName: loc });
    }
    setLocationInput(loc);
    setIsLocationDropdownOpen(false);
  };

  const handleAiGenerate = () => {
    if (!node || node.type !== 'channel') return;
    
    const upstreamAction = findUpstreamActionNode();
    const offerName = upstreamAction?.data?.productName || upstreamAction?.data?.label || 'the offer';
    const channel = activeChannelTab || (data.selectedChannels?.[0] || 'sms');
    const channelLabel = channel === 'sms' ? 'SMS' : channel === 'email' ? 'Email' : channel.charAt(0).toUpperCase() + channel.slice(1);
    
    // ✅ Fix-2: Create a prompt that explicitly uses generate_multilingual_copy tool
    const prompt = `Generate professional marketing copy for ${channelLabel} channel about: ${offerName}

Requirements:
- Use the generate_multilingual_copy tool to create the copy
- Language: English
- Tone: Professional and engaging
- Format: SMS/Email marketing message
- Maximum 160 characters for SMS format
- Return ONLY the final marketing copy text, without any reasoning or explanation

Please use the generate_multilingual_copy tool now.`;

    // ✅ Fix-4: Create callback to extract and update copy with improved logic
    const handleResponse = (response: string | null) => {
      console.log('📥 handleResponse called with:', response ? response.substring(0, 100) + '...' : 'null');
      
      // ✅ Fix: Handle null/undefined response
      if (!response || typeof response !== 'string') {
        console.warn('⚠️ AI response is empty or invalid');
        return;
      }
      
      // Extract the final copy text from the response
      let cleanCopy = response.trim();
      
      // Remove markdown code blocks if present
      cleanCopy = cleanCopy.replace(/```[\s\S]*?```/g, '');
      
      // Remove any reasoning tags or explanations
      cleanCopy = cleanCopy.replace(/<think>[\s\S]*?<\/think>/g, '');
      cleanCopy = cleanCopy.replace(/<think>[\s\S]*?<\/redacted_reasoning>/g, '');
      
      // Extract text from markdown links or formatting
      cleanCopy = cleanCopy.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
      cleanCopy = cleanCopy.replace(/\*\*([^\*]+)\*\*/g, '$1');
      cleanCopy = cleanCopy.replace(/\*([^\*]+)\*/g, '$1');
      
      // Remove any "Here's the copy:" or similar prefixes
      const copyMatch = cleanCopy.match(/(?:copy|message|text|here'?s?)[:：]\s*(.+)/is);
      if (copyMatch) {
        cleanCopy = copyMatch[1].trim();
      }
      
      // ✅ Fix-4: Channel-specific extraction logic
      const lines = cleanCopy.split('\n').filter(line => line.trim().length > 0);
      
      if (channel === 'email') {
        // For Email: Extract full content, but remove Subject line if present
        let emailBody = cleanCopy;
        
        // Remove Subject line if it exists
        emailBody = emailBody.replace(/^Subject:\s*.+$/im, '');
        
        // Remove empty lines at the start
        emailBody = emailBody.replace(/^\s*\n+/g, '');
        
        // Take all content (up to reasonable length)
        cleanCopy = emailBody.trim();
        
        // If still too long, take first 500 characters
        if (cleanCopy.length > 500) {
          cleanCopy = cleanCopy.substring(0, 500).trim() + '...';
        }
      } else if (channel === 'sms') {
        // For SMS: Extract first line or first few lines (max 160 chars)
        if (lines.length > 0) {
          cleanCopy = lines[0].trim();
          // If first line is too short, take first few lines
          if (cleanCopy.length < 20 && lines.length > 1) {
            cleanCopy = lines.slice(0, 3).join(' ').trim();
          }
          // Truncate to 160 chars for SMS
          if (cleanCopy.length > 160) {
            cleanCopy = cleanCopy.substring(0, 157).trim() + '...';
          }
        }
      } else {
        // For other channels (Facebook, etc.): Extract first paragraph or first few lines
        if (lines.length > 0) {
          // Try to find first paragraph (non-empty lines until double newline)
          const firstParagraph = lines.slice(0, 5).join('\n').trim();
          cleanCopy = firstParagraph;
          
          // If too long, truncate to 200 chars
          if (cleanCopy.length > 200) {
            cleanCopy = cleanCopy.substring(0, 197).trim() + '...';
          }
        }
      }
      
      // Only update if we have valid copy
      if (cleanCopy && cleanCopy.length > 0) {
        console.log('✅ Extracted copy for', channel, ':', cleanCopy.substring(0, 100) + '...');
        // Update the node with the extracted copy
        const currentContent = data.channelContent || {};
        onUpdateNode(node.id, {
          channelContent: {
            ...currentContent,
            [channel]: { ...currentContent[channel], text: cleanCopy }
          }
        });
      } else {
        console.warn('⚠️ Extracted copy is empty after processing');
      }
    };
    
    // ✅ Fix-3: Open ChatAssistant with prompt and callback
    openChat(prompt, handleResponse);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] max-w-[95vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-slate-700">
          <Settings size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wide">
            Config: {node.type}
          </h3>
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6">
        {/* Common: Label */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Label / Name</label>
          <input
            type="text"
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none"
            value={data.label}
            onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
          />
        </div>

        {/* 1. Segment Config - Advanced Logic Mode Only */}
        {node.type === 'segment' && (
          <div className="space-y-6">
            {/* ✅ Use AudienceBuilder Component */}
            <AudienceBuilder
              criteria={data.segmentCriteria}
              onChange={(newCriteria) => {
                onUpdateNode(node.id, { segmentCriteria: newCriteria });
              }}
              audienceSize={audienceSize}
              isEstimating={estimatingAudience}
              showVerifyButton={true}
            />
          </div>
        )}

        {/* Legacy Segment Config - REMOVED - Now using AudienceBuilder */}
        {false && node.type === 'segment' && (
          <div className="space-y-6">
            {/* ✅ Opt-1: Always use Advanced Logic Mode - Initialize if empty */}
            {(!data.segmentCriteria?.conditionGroups || data.segmentCriteria.conditionGroups.length === 0) && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <span className="text-sm font-bold text-indigo-900">Customer Profile Builder</span>
                </div>
                <p className="text-xs text-indigo-700 mb-3">Each Group represents a target customer profile. Groups are combined with AND/OR to find intersections or unions.</p>
                <button
                  onClick={() => {
                    updateCriteria('conditionGroups', [{
                      id: `group-${Date.now()}`,
                      conditions: [],
                      operator: 'AND'
                    }]);
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Create First Customer Profile
                </button>
              </div>
            )}

            {/* ✅ Opt-1: Advanced Logic Mode - Condition Groups (Always Active) */}
            {data.segmentCriteria?.conditionGroups && data.segmentCriteria.conditionGroups.length > 0 && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Condition Groups</label>
                {data.segmentCriteria.conditionGroups.map((group: any, groupIdx: number) => (
                  <div key={group.id} className="space-y-3">
                    {/* Inter-Group Operator */}
                    {groupIdx > 0 && (
                      <div className="flex items-center justify-center py-1">
                        <select
                          className="px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-300 rounded-lg font-bold min-w-[80px]"
                          value={group.groupOperator || 'OR'}
                          onChange={(e) => {
                            const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                            newGroups[groupIdx] = { ...group, groupOperator: e.target.value as 'AND' | 'OR' };
                            updateCriteria('conditionGroups', newGroups);
                          }}
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                        <span className="ml-2 text-[10px] text-purple-600 font-medium">(between groups)</span>
                      </div>
                    )}
                    
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-indigo-800">Group {groupIdx + 1}</span>
                          <select
                            className="px-2 py-1 text-xs bg-white border border-indigo-200 rounded font-medium min-w-[60px]"
                            value={group.operator}
                            onChange={(e) => {
                              const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                              newGroups[groupIdx] = { ...group, operator: e.target.value as 'AND' | 'OR' };
                              updateCriteria('conditionGroups', newGroups);
                            }}
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                          <span className="text-[10px] text-indigo-600">(within group)</span>
                        </div>
                        {data.segmentCriteria.conditionGroups.length > 1 && (
                          <button
                            onClick={() => {
                              const newGroups = data.segmentCriteria?.conditionGroups?.filter((_: any, i: number) => i !== groupIdx) || [];
                              updateCriteria('conditionGroups', newGroups);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {group.conditions.map((condition: any, condIdx: number) => (
                          <div key={condition.id} className="flex gap-2 items-center bg-white p-2 rounded border border-indigo-100 flex-wrap">
                            <select
                              className="flex-1 min-w-[120px] max-w-full px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                              value={condition.field}
                              onChange={(e) => {
                                const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                newGroups[groupIdx].conditions[condIdx] = { ...condition, field: e.target.value, value: '' };
                                updateCriteria('conditionGroups', newGroups);
                              }}
                            >
                              <option value="">Select Field</option>
                              <option value="age">Age</option>
                              <option value="gender">Gender</option>
                              <option value="city">City / Region</option>
                              <option value="tier">Loyalty Tier</option>
                              <option value="arpu_30d">ARPU (30 days)</option>
                              <option value="churn_score">Churn Score</option>
                              <option value="created_at">Tenure (Days since registration)</option>
                              <option value="active_status">Active Status</option>
                              <option value="balance">Balance</option>
                              <option value="sim_type">SIM Type</option>
                              <option value="app_usage">App Usage</option>
                              <option value="user_tags">User Tags / Groups</option>
                            </select>
                            <select
                              className="px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded min-w-[70px] max-w-[90px] shrink-0"
                              value={condition.operator}
                              onChange={(e) => {
                                const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                newGroups[groupIdx].conditions[condIdx] = { ...condition, operator: e.target.value };
                                updateCriteria('conditionGroups', newGroups);
                              }}
                            >
                              <option value=">">&gt;</option>
                              <option value="<">&lt;</option>
                              <option value="=">=</option>
                              <option value=">=">&gt;=</option>
                              <option value="<=">&lt;=</option>
                              <option value="in">In (Multiple)</option>
                              <option value="contains">Contains</option>
                            </select>
                            {/* Value Input - Support different types based on field */}
                            {condition.field === 'city' && condition.operator === 'in' ? (
                              <div className="flex-1 min-w-[120px]">
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {(Array.isArray(condition.value) ? condition.value : []).map((city: string) => (
                                    <span key={city} className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                      {city}
                                      <button onClick={() => {
                                        const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                        newGroups[groupIdx].conditions[condIdx].value = (condition.value as string[]).filter(c => c !== city);
                                        updateCriteria('conditionGroups', newGroups);
                                      }} className="hover:text-indigo-900"><X size={10} /></button>
                                    </span>
                                  ))}
                                </div>
                                <select
                                  className="w-full px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                      const currentValue = Array.isArray(condition.value) ? condition.value : [];
                                      newGroups[groupIdx].conditions[condIdx].value = [...currentValue, e.target.value];
                                      updateCriteria('conditionGroups', newGroups);
                                    }
                                  }}
                                >
                                  <option value="">Add City...</option>
                                  {['Yangon', 'Mandalay', 'Nay Pyi Taw', 'Bago', 'Shan State'].filter(c => !(Array.isArray(condition.value) ? condition.value : []).includes(c)).map(city => (
                                    <option key={city} value={city}>{city}</option>
                                  ))}
                                </select>
                              </div>
                            ) : condition.field === 'tier' && condition.operator === 'in' ? (
                              <div className="flex-1 min-w-[120px]">
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {(Array.isArray(condition.value) ? condition.value : []).map((tier: string) => (
                                    <span key={tier} className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                      {tier}
                                      <button onClick={() => {
                                        const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                        newGroups[groupIdx].conditions[condIdx].value = (condition.value as string[]).filter(t => t !== tier);
                                        updateCriteria('conditionGroups', newGroups);
                                      }} className="hover:text-indigo-900"><X size={10} /></button>
                                    </span>
                                  ))}
                                </div>
                                <select
                                  className="w-full px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                      const currentValue = Array.isArray(condition.value) ? condition.value : [];
                                      newGroups[groupIdx].conditions[condIdx].value = [...currentValue, e.target.value];
                                      updateCriteria('conditionGroups', newGroups);
                                    }
                                  }}
                                >
                                  <option value="">Add Tier...</option>
                                  {['Crown', 'Diamond', 'Platinum', 'Gold', 'Silver'].filter(t => !(Array.isArray(condition.value) ? condition.value : []).includes(t)).map(tier => (
                                    <option key={tier} value={tier}>{tier}</option>
                                  ))}
                                </select>
                              </div>
                            ) : condition.field === 'active_status' ? (
                              <select
                                className="flex-1 min-w-[100px] px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                                value={condition.value as string || ''}
                                onChange={(e) => {
                                  const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                  newGroups[groupIdx].conditions[condIdx] = { ...condition, value: e.target.value };
                                  updateCriteria('conditionGroups', newGroups);
                                }}
                              >
                                <option value="">Select Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Dormant">Dormant</option>
                              </select>
                            ) : condition.field === 'gender' ? (
                              <select
                                className="flex-1 min-w-[100px] px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                                value={condition.value as string || ''}
                                onChange={(e) => {
                                  const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                  newGroups[groupIdx].conditions[condIdx] = { ...condition, value: e.target.value };
                                  updateCriteria('conditionGroups', newGroups);
                                }}
                              >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                              </select>
                            ) : condition.field === 'sim_type' ? (
                              <select
                                className="flex-1 min-w-[100px] px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                                value={condition.value as string || ''}
                                onChange={(e) => {
                                  const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                  newGroups[groupIdx].conditions[condIdx] = { ...condition, value: e.target.value };
                                  updateCriteria('conditionGroups', newGroups);
                                }}
                              >
                                <option value="">Select SIM Type</option>
                                <option value="Prepaid">Prepaid</option>
                                <option value="Postpaid">Postpaid</option>
                              </select>
                            ) : condition.field === 'churn_score' ? (
                              <input
                                type="text"
                                placeholder="0.00 - 1.00"
                                className="flex-1 min-w-[80px] max-w-[120px] px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                                value={condition.value || ''}
                                onChange={(e) => {
                                  const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                  const inputVal = e.target.value.trim();
                                  // Allow empty, or valid decimal between 0 and 1
                                  if (inputVal === '' || /^(0(\.\d+)?|1(\.0+)?|0\.\d+)$/.test(inputVal)) {
                                    const val = inputVal === '' ? '' : parseFloat(inputVal);
                                    if (val === '' || (!isNaN(val) && val >= 0 && val <= 1)) {
                                      newGroups[groupIdx].conditions[condIdx] = { ...condition, value: val };
                                      updateCriteria('conditionGroups', newGroups);
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  // Ensure value is properly formatted on blur
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 1) {
                                    const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                    newGroups[groupIdx].conditions[condIdx] = { ...condition, value: val };
                                    updateCriteria('conditionGroups', newGroups);
                                  }
                                }}
                              />
                            ) : condition.field === 'app_usage' ? (
                              <AppUsageSelector
                                value={condition.value as string || ''}
                                onChange={(val) => {
                                  const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                  newGroups[groupIdx].conditions[condIdx] = { ...condition, value: val };
                                  updateCriteria('conditionGroups', newGroups);
                                }}
                              />
                            ) : condition.field === 'user_tags' ? (
                              <UserTagsSelector
                                value={condition.value as string[] || []}
                                onChange={(val) => {
                                  const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                  newGroups[groupIdx].conditions[condIdx] = { ...condition, value: val };
                                  updateCriteria('conditionGroups', newGroups);
                                }}
                                onSelectSegment={(segmentCriteria) => {
                                  // ✅ When a Segment is selected, apply its criteria to the node
                                  // Merge with existing criteria (prefer segment's criteria for overlapping fields)
                                  const mergedCriteria = { ...data.segmentCriteria, ...segmentCriteria };
                                  onUpdateNode(node.id, {
                                    segmentCriteria: mergedCriteria
                                  });
                                }}
                              />
                            ) : (
                              <input
                                type={condition.field === 'age' || condition.field === 'arpu_30d' || condition.field === 'created_at' || condition.field === 'balance' ? 'number' : 'text'}
                                placeholder={condition.field === 'created_at' ? 'Days' : 'Value'}
                                className="flex-1 min-w-[80px] max-w-[120px] px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                                value={condition.value || ''}
                                onChange={(e) => {
                                  const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                  const value = condition.field === 'age' || condition.field === 'arpu_30d' || condition.field === 'created_at' || condition.field === 'balance' 
                                    ? (e.target.value === '' ? '' : Number(e.target.value))
                                    : e.target.value;
                                  newGroups[groupIdx].conditions[condIdx] = { ...condition, value };
                                  updateCriteria('conditionGroups', newGroups);
                                }}
                              />
                            )}
                            <button
                              onClick={() => {
                                const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                                newGroups[groupIdx].conditions = group.conditions.filter((_: any, i: number) => i !== condIdx);
                                updateCriteria('conditionGroups', newGroups);
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newGroups = [...(data.segmentCriteria?.conditionGroups || [])];
                            newGroups[groupIdx].conditions.push({
                              id: `cond-${Date.now()}`,
                              field: '',
                              operator: '>',
                              value: ''
                            });
                            updateCriteria('conditionGroups', newGroups);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-medium"
                        >
                          + Add Condition ({group.operator})
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newGroups = [...(data.segmentCriteria?.conditionGroups || []), {
                      id: `group-${Date.now()}`,
                      conditions: [],
                      operator: 'AND',
                      groupOperator: 'OR'
                    }];
                    updateCriteria('conditionGroups', newGroups);
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
                >
                  + Add New Group
                </button>
              </div>
            )}

            {/* ✅ Opt-3: Verify Button - Show matching users */}
            {audienceSize !== null && !estimatingAudience && (
              <div className="mt-4">
                <button
                  onClick={async () => {
                    setVerifyLoading(true);
                    setVerifyModalOpen(true);
                    try {
                      // Build query to fetch actual user data (not just count)
                      const groups = data.segmentCriteria?.conditionGroups || [];
                      
                      if (groups.length === 0) {
                        setVerifyUsers([]);
                        setVerifyLoading(false);
                        return;
                      }

                      // Build query without head: true to get actual data
                      let query = supabase.from('profiles').select('*').limit(50);
                      
                      // Apply all conditions from all groups (AND logic between groups)
                      for (const group of groups) {
                        for (const condition of group.conditions) {
                          if (!condition.field || condition.value === '' || condition.value === null) continue;
                          
                          const val = condition.value;
                          switch (condition.field) {
                            case 'age':
                              const ageVal = Number(val);
                              if (!isNaN(ageVal)) {
                                if (condition.operator === '>') query = query.gt('age', ageVal);
                                else if (condition.operator === '<') query = query.lt('age', ageVal);
                                else if (condition.operator === '>=') query = query.gte('age', ageVal);
                                else if (condition.operator === '<=') query = query.lte('age', ageVal);
                                else if (condition.operator === '=') query = query.eq('age', ageVal);
                              }
                              break;
                            case 'city':
                              if (condition.operator === 'in' && Array.isArray(val)) {
                                query = query.in('location_city', val);
                              } else if (condition.operator === '=') {
                                query = query.eq('location_city', val);
                              }
                              break;
                            case 'tier':
                              if (condition.operator === 'in' && Array.isArray(val)) {
                                query = query.in('tier', val);
                              } else if (condition.operator === '=') {
                                query = query.eq('tier', val);
                              }
                              break;
                            case 'arpu_30d':
                              const arpuVal = Number(val);
                              if (!isNaN(arpuVal)) {
                                if (condition.operator === '>') query = query.gt('arpu_30d', arpuVal);
                                else if (condition.operator === '<') query = query.lt('arpu_30d', arpuVal);
                                else if (condition.operator === '>=') query = query.gte('arpu_30d', arpuVal);
                                else if (condition.operator === '<=') query = query.lte('arpu_30d', arpuVal);
                                else if (condition.operator === '=') query = query.eq('arpu_30d', arpuVal);
                              }
                              break;
                            case 'churn_score':
                              const churnVal = Number(val);
                              if (!isNaN(churnVal)) {
                                if (condition.operator === '>') query = query.gt('churn_score', churnVal);
                                else if (condition.operator === '<') query = query.lt('churn_score', churnVal);
                                else if (condition.operator === '>=') query = query.gte('churn_score', churnVal);
                                else if (condition.operator === '<=') query = query.lte('churn_score', churnVal);
                                else if (condition.operator === '=') query = query.eq('churn_score', churnVal);
                              }
                              break;
                            case 'gender':
                              if (condition.operator === '=') query = query.eq('gender', val);
                              break;
                            case 'balance':
                              const balanceVal = Number(val);
                              if (!isNaN(balanceVal)) {
                                if (condition.operator === '>') query = query.gt('balance', balanceVal);
                                else if (condition.operator === '<') query = query.lt('balance', balanceVal);
                                else if (condition.operator === '>=') query = query.gte('balance', balanceVal);
                                else if (condition.operator === '<=') query = query.lte('balance', balanceVal);
                                else if (condition.operator === '=') query = query.eq('balance', balanceVal);
                              }
                              break;
                            case 'active_status':
                              if (condition.operator === '=') {
                                const statusMap: Record<string, string> = {
                                  'Active': 'Active',
                                  'Inactive': 'Inactive',
                                  'Dormant': 'Inactive'
                                };
                                const mappedStatus = statusMap[val as string] || val;
                                query = query.eq('status', mappedStatus);
                              }
                              break;
                          }
                        }
                      }
                      
                      const { data: users, error } = await query;
                      if (error) throw error;
                      setVerifyUsers(users || []);
                    } catch (err) {
                      console.error('Failed to verify users:', err);
                      setVerifyUsers([]);
                    } finally {
                      setVerifyLoading(false);
                    }
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Verify Users
                </button>
              </div>
            )}

            {/* Verify Users Modal */}
            {verifyModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900">Matching Users ({verifyUsers.length})</h3>
                    <button onClick={() => setVerifyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {verifyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-indigo-600" />
                        <span className="ml-3 text-slate-600">Loading users...</span>
                      </div>
                    ) : verifyUsers.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No users match the criteria.</p>
                    ) : (
                      <div className="space-y-2">
                        {verifyUsers.map((user: any) => (
                          <div key={user.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-slate-900">{user.name || 'Unknown'}</p>
                                <p className="text-xs text-slate-600 mt-1">ID: {user.id}</p>
                                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                  <span>Age: {user.age || 'N/A'}</span>
                                  <span>City: {user.location_city || 'N/A'}</span>
                                  <span>Tier: {user.tier || 'N/A'}</span>
                                  <span>ARPU: {user.arpu_30d ? `${user.arpu_30d.toLocaleString()} Ks` : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ Real-time Audience Estimation */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm mt-4">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Estimated Reach</span>
                <span className="p-1 bg-emerald-100 rounded text-emerald-600">
                  {estimatingAudience ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Users size={14} />
                  )}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-900">
                  {estimatingAudience ? (
                    <span className="text-emerald-600">Calculating...</span>
                  ) : audienceSize !== null ? (
                    audienceSize.toLocaleString()
                  ) : (
                    <span className="text-emerald-600 text-lg">Configure criteria</span>
                  )}
                </span>
                <span className="text-xs font-medium text-emerald-700">Users</span>
              </div>
              {audienceSize !== null && !estimatingAudience && (
                <div className="w-full bg-emerald-200/50 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, (audienceSize / 1000) * 10))}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Trigger Config - ✅ Opt-2: Simplified with Multi-select Toggle + Schedule Required */}
        {node.type === 'trigger' && (
          <div className="space-y-6">
            {/* ✅ Opt-2: Multi-select Toggle for Conditions (Topup, Data, Voice, Location, App) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Trigger Conditions <span className="text-slate-400 font-normal">(Multi-select)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'topup', label: 'Topup', icon: DollarSign },
                  { id: 'data', label: 'Data', icon: Wifi },
                  { id: 'voice', label: 'Voice', icon: Phone },
                  { id: 'location', label: 'Location', icon: MapPin },
                  { id: 'app', label: 'App', icon: AppWindow }
                ].map(cat => {
                  const isSelected = data.triggerConfig?.conditions?.some(c => c.category === cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (isSelected) {
                          // Remove condition
                          const condition = data.triggerConfig?.conditions?.find(c => c.category === cat.id);
                          if (condition) removeTriggerCondition(condition.id);
                        } else {
                          // Add condition
                          addTriggerCondition(cat.id as 'topup' | 'data' | 'voice' | 'location' | 'app');
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 text-amber-700 ring-2 ring-amber-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <cat.icon size={16} className="mb-1" />
                      <span className="text-[10px] font-bold text-center">{cat.label}</span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-amber-600 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ✅ Opt-2: Condition Configuration List */}
            {data.triggerConfig?.conditions && data.triggerConfig.conditions.length > 0 && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Configure Conditions</label>
                {data.triggerConfig.conditions.map((condition, idx) => (
                  <div key={condition.id} className="space-y-3">
                    {/* Relation to Next Condition */}
                    {idx > 0 && (
                      <div className="flex items-center justify-center py-1">
                        <select
                          className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg font-bold"
                          value={data.triggerConfig?.conditions?.[idx - 1]?.relationToNext || 'AND'}
                          onChange={(e) => {
                            const prevCondition = data.triggerConfig?.conditions?.[idx - 1];
                            if (prevCondition) {
                              updateTriggerCondition(prevCondition.id, { relationToNext: e.target.value as 'AND' | 'OR' });
                            }
                          }}
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                        <span className="ml-2 text-[10px] text-indigo-600 font-medium">(to next condition)</span>
                      </div>
                    )}
                    
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-800">
                            {condition.category === 'topup' ? 'Topup' :
                             condition.category === 'data' ? 'Data' :
                             condition.category === 'voice' ? 'Voice' :
                             condition.category === 'location' ? 'Location' : 'App'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeTriggerCondition(condition.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      
                      {/* Condition-specific inputs */}
                      {['topup', 'data', 'voice'].includes(condition.category) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operator</label>
                            <select
                              className="w-full p-2 bg-white border border-amber-200 rounded text-xs"
                              value={condition.operator || '>'}
                              onChange={(e) => updateTriggerCondition(condition.id, { operator: e.target.value })}
                            >
                              <option value="<">Less than (&lt;)</option>
                              <option value=">">Greater than (&gt;)</option>
                              <option value="=">Equals (=)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Threshold</label>
                            <div className="relative">
                              <span className="absolute right-2 top-2 text-slate-400 text-[10px] font-bold pointer-events-none">
                                {condition.unit || (condition.category === 'topup' ? 'Ks' : condition.category === 'data' ? 'MB' : 'Mins')}
                              </span>
                              <input
                                type="number"
                                className="w-full pr-8 p-2 bg-white border border-amber-200 rounded text-xs outline-none"
                                value={condition.threshold || ''}
                                onChange={(e) => updateTriggerCondition(condition.id, { threshold: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {condition.category === 'location' && (
                        <div className="space-y-3" ref={locationInputRef}>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Location</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search location..."
                                className="w-full p-2 pl-8 bg-white border border-amber-200 rounded text-xs outline-none"
                                value={locationInput || condition.locationName || ''}
                                onChange={(e) => {
                                  setLocationInput(e.target.value);
                                  setIsLocationDropdownOpen(true);
                                }}
                                onFocus={() => setIsLocationDropdownOpen(true)}
                              />
                              <MapPin className="absolute left-2 top-2.5 text-slate-400" size={14} />
                              {isLocationDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                  {MOCK_LOCATIONS.filter(loc => loc.toLowerCase().includes(locationInput.toLowerCase())).map(loc => (
                                    <div
                                      key={loc}
                                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                                      onClick={() => selectLocation(loc, condition.id)}
                                    >
                                      {loc}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Radius (km)</label>
                            <input
                              type="number"
                              className="w-full p-2 bg-white border border-amber-200 rounded text-xs outline-none"
                              value={condition.radius || ''}
                              onChange={(e) => updateTriggerCondition(condition.id, { radius: e.target.value })}
                              placeholder="5"
                            />
                          </div>
                        </div>
                      )}

                      {condition.category === 'app' && (
                        <div className="space-y-3" ref={appInputRef}>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target App</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search App..."
                                className="w-full p-2 pl-8 bg-white border border-amber-200 rounded text-xs outline-none"
                                value={appInput || condition.appName || ''}
                                onChange={(e) => {
                                  setAppInput(e.target.value);
                                  setIsAppDropdownOpen(true);
                                }}
                                onFocus={() => setIsAppDropdownOpen(true)}
                              />
                              <Search className="absolute left-2 top-2.5 text-slate-400" size={14} />
                              {isAppDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                  {MOCK_APPS.filter(app => app.name.toLowerCase().includes(appInput.toLowerCase())).map(app => (
                                    <div
                                      key={app.name}
                                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs text-slate-700 flex items-center gap-2"
                                      onClick={() => selectApp(app, condition.id)}
                                    >
                                      <app.icon size={14} className="text-slate-400" />
                                      <span>{app.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ✅ Opt-2: Schedule Configuration (Required) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase">
                  Schedule <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(Required)</span>
                </label>
              </div>
              
              {/* Schedule Type Selection */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => updateTriggerConfig({ scheduleType: 'specific' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                    data.triggerConfig?.scheduleType === 'specific'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Specific Time
                </button>
                <button
                  onClick={() => updateTriggerConfig({ scheduleType: 'ongoing' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                    data.triggerConfig?.scheduleType === 'ongoing' || !data.triggerConfig?.scheduleType
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Ongoing
                </button>
              </div>

              {/* Specific Time Configuration */}
              {data.triggerConfig?.scheduleType === 'specific' && (
                <div className="space-y-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                      <input
                        type="date"
                        className="w-full p-2 bg-white border border-indigo-200 rounded text-xs outline-none"
                        value={data.triggerConfig?.startDate || ''}
                        onChange={(e) => updateTriggerConfig({ startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                      <input
                        type="date"
                        className="w-full p-2 bg-white border border-indigo-200 rounded text-xs outline-none"
                        value={data.triggerConfig?.endDate || ''}
                        onChange={(e) => updateTriggerConfig({ endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* All Day vs Specific Time */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.triggerConfig?.allDay || false}
                        onChange={(e) => updateTriggerConfig({ allDay: e.target.checked, specificTime: !e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-slate-700">All Day (24 hours valid)</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.triggerConfig?.specificTime || false}
                        onChange={(e) => updateTriggerConfig({ specificTime: e.target.checked, allDay: !e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-slate-700">Specific Time Window</span>
                    </label>
                  </div>

                  {/* Specific Time Configuration */}
                  {data.triggerConfig?.specificTime && (
                    <div className="space-y-3 pt-2 border-t border-indigo-200">
                      {/* Daily vs Weekly Mode */}
                      <div className="flex bg-white p-1 rounded-lg border border-indigo-200">
                        <button
                          onClick={() => updateTriggerConfig({ weeklyDays: undefined })}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${
                            !data.triggerConfig?.weeklyDays
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-slate-500'
                          }`}
                        >
                          Daily
                        </button>
                        <button
                          onClick={() => updateTriggerConfig({ weeklyDays: [] })}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${
                            data.triggerConfig?.weeklyDays && data.triggerConfig.weeklyDays.length >= 0
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-slate-500'
                          }`}
                        >
                          Weekly
                        </button>
                      </div>

                      {/* Daily Time */}
                      {!data.triggerConfig?.weeklyDays && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Time</label>
                            <input
                              type="time"
                              className="w-full p-2 bg-white border border-indigo-200 rounded text-xs outline-none"
                              value={data.triggerConfig?.dailyTimeStart || '19:00'}
                              onChange={(e) => updateTriggerConfig({ dailyTimeStart: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Time</label>
                            <input
                              type="time"
                              className="w-full p-2 bg-white border border-indigo-200 rounded text-xs outline-none"
                              value={data.triggerConfig?.dailyTimeEnd || '20:00'}
                              onChange={(e) => updateTriggerConfig({ dailyTimeEnd: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {/* Weekly Time */}
                      {data.triggerConfig?.weeklyDays !== undefined && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Select Days</label>
                            <div className="grid grid-cols-4 gap-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                const isSelected = data.triggerConfig?.weeklyDays?.includes(day);
                                return (
                                  <button
                                    key={day}
                                    onClick={() => {
                                      const currentDays = data.triggerConfig?.weeklyDays || [];
                                      const newDays = isSelected
                                        ? currentDays.filter(d => d !== day)
                                        : [...currentDays, day];
                                      updateTriggerConfig({ weeklyDays: newDays });
                                    }}
                                    className={`p-1.5 text-[10px] font-bold rounded border transition-all ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {day.slice(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Time</label>
                              <input
                                type="time"
                                className="w-full p-2 bg-white border border-indigo-200 rounded text-xs outline-none"
                                value={data.triggerConfig?.weeklyTimeStart || '19:00'}
                                onChange={(e) => updateTriggerConfig({ weeklyTimeStart: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Time</label>
                              <input
                                type="time"
                                className="w-full p-2 bg-white border border-indigo-200 rounded text-xs outline-none"
                                value={data.triggerConfig?.weeklyTimeEnd || '20:00'}
                                onChange={(e) => updateTriggerConfig({ weeklyTimeEnd: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Ongoing Schedule */}
              {(data.triggerConfig?.scheduleType === 'ongoing' || !data.triggerConfig?.scheduleType) && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Clock className="text-emerald-600" size={16} />
                    <span className="text-xs font-medium text-emerald-800">
                      Campaign will run continuously until manually stopped.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Action Node Config - Using Offers Table */}
        {node.type === 'action' && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Action Type</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => onUpdateNode(node.id, { actionType: 'marketing' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${data.actionType !== 'info' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Marketing / Sales
                </button>
                <button
                  onClick={() => onUpdateNode(node.id, { actionType: 'info' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${data.actionType === 'info' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}
                >
                  Informational
                </button>
              </div>
            </div>

            {data.actionType !== 'info' ? (
              <div className="space-y-4">
                <div className="p-4 bg-pink-50/50 rounded-lg border border-pink-100">
                  <label className="block text-xs font-bold text-pink-800 uppercase mb-2">Select Marketing Offer</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {offers.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No offers available. Create one in Product Catalog.</p>
                    ) : (
                      offers.map(offer => (
                        <button
                          key={offer.id}
                          onClick={() => {
                            onUpdateNode(node.id, {
                              offerId: offer.id,
                              productId: offer.productId,
                              productName: offer.marketingName,
                              subLabel: `${offer.finalPrice.toLocaleString()} Ks`,
                              landingPageUrl: undefined // Clear custom URL when selecting offer
                            });
                          }}
                          className={`w-full p-3 rounded-lg border transition-all text-left ${
                            data.offerId === offer.id
                              ? 'bg-pink-100 border-pink-300 ring-2 ring-pink-200'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {offer.imageUrl && (
                              <img
                                src={offer.imageUrl}
                                alt={offer.marketingName}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{offer.marketingName}</p>
                              <p className="text-xs text-slate-600">
                                {offer.finalPrice.toLocaleString()} Ks
                                {offer.discountPercent && (
                                  <span className="ml-2 text-red-600 font-bold">-{offer.discountPercent}%</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  
                  {/* ✅ Category 2.1: Custom Link Fallback */}
                  <div className="mt-4 pt-4 border-t border-pink-200">
                    <label className="block text-xs font-bold text-pink-800 uppercase mb-2">Or Use Custom Link</label>
                    <input
                      type="url"
                      placeholder="https://example.com/offer"
                      className="w-full p-2.5 bg-white border border-pink-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-100 outline-none"
                      value={data.landingPageUrl || ''}
                      onChange={(e) => {
                        onUpdateNode(node.id, {
                          landingPageUrl: e.target.value,
                          offerId: e.target.value ? undefined : data.offerId // Clear offer if custom URL is set
                        });
                      }}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Leave empty to use selected offer</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notification Topic</label>
                <select
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm mb-3"
                  value={data.subLabel || ''}
                  onChange={(e) => onUpdateNode(node.id, { subLabel: e.target.value })}
                >
                  <option value="General Notice">General Notice</option>
                  <option value="Holiday Greeting">Holiday Greeting</option>
                  <option value="Maintenance Alert">Maintenance Alert</option>
                  <option value="Bill Shock Warning">Bill Shock Warning</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* ✅ Category 2.2: Logic Node Config */}
        {node.type === 'logic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Branch Conditions</label>
              <div className="space-y-3">
                {(data.branches || []).map((branch: any, branchIdx: number) => (
                  <div key={branch.id || branchIdx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        placeholder="Branch Label (e.g., YES, NO, High Value)"
                        className="flex-1 px-2 py-1 text-sm font-semibold bg-white border border-blue-200 rounded focus:ring-2 focus:ring-blue-100 outline-none"
                        value={branch.label || ''}
                        onChange={(e) => {
                          const newBranches = [...(data.branches || [])];
                          newBranches[branchIdx] = { ...branch, label: e.target.value };
                          onUpdateNode(node.id, { branches: newBranches });
                        }}
                      />
                      <button
                        onClick={() => {
                          const newBranches = (data.branches || []).filter((_: any, i: number) => i !== branchIdx);
                          onUpdateNode(node.id, { branches: newBranches });
                        }}
                        className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(branch.conditions || []).map((condition: any, condIdx: number) => (
                        <div key={condition.id || condIdx} className="flex gap-2 items-center flex-wrap w-full">
                          <select
                            className="flex-1 min-w-[120px] max-w-full px-2 py-1.5 text-xs bg-white border border-blue-200 rounded focus:ring-1 focus:ring-blue-100 outline-none"
                            value={condition.field || ''}
                            onChange={(e) => {
                              const newBranches = [...(data.branches || [])];
                              newBranches[branchIdx].conditions[condIdx] = { ...condition, field: e.target.value };
                              onUpdateNode(node.id, { branches: newBranches });
                            }}
                          >
                            <option value="">Select Field</option>
                            <option value="Action: Purchased">Action: Purchased</option>
                            <option value="Action: Clicked">Action: Clicked</option>
                            <option value="Action: Redeemed">Action: Redeemed</option>
                            <option value="Action: Replied">Action: Replied</option>
                            <option value="Action: Viewed">Action: Viewed</option>
                            <option value="Profile: ARPU">Profile: ARPU</option>
                            <option value="Profile: Balance">Profile: Balance</option>
                            <option value="Profile: Tier">Profile: Tier</option>
                          </select>
                          <select
                            className="px-2 py-1.5 text-xs bg-white border border-blue-200 rounded focus:ring-1 focus:ring-blue-100 outline-none min-w-[70px] max-w-[90px] shrink-0"
                            value={condition.operator || ''}
                            onChange={(e) => {
                              const newBranches = [...(data.branches || [])];
                              newBranches[branchIdx].conditions[condIdx] = { ...condition, operator: e.target.value };
                              onUpdateNode(node.id, { branches: newBranches });
                            }}
                          >
                            <option value="">Op</option>
                            <option value="=">=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="<=">&lt;=</option>
                            <option value="is_true">Is True</option>
                            <option value="is_false">Is False</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Value"
                            className="flex-1 min-w-[80px] max-w-[120px] px-2 py-1.5 text-xs bg-white border border-blue-200 rounded focus:ring-1 focus:ring-blue-100 outline-none"
                            value={condition.value || ''}
                            onChange={(e) => {
                              const newBranches = [...(data.branches || [])];
                              newBranches[branchIdx].conditions[condIdx] = { ...condition, value: e.target.value };
                              onUpdateNode(node.id, { branches: newBranches });
                            }}
                          />
                          <button
                            onClick={() => {
                              const newBranches = [...(data.branches || [])];
                              newBranches[branchIdx].conditions = branch.conditions.filter((_: any, i: number) => i !== condIdx);
                              onUpdateNode(node.id, { branches: newBranches });
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newBranches = [...(data.branches || [])];
                          if (!newBranches[branchIdx].conditions) newBranches[branchIdx].conditions = [];
                          newBranches[branchIdx].conditions.push({
                            id: `cond-${Date.now()}`,
                            field: '',
                            operator: '',
                            value: ''
                          });
                          onUpdateNode(node.id, { branches: newBranches });
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                      >
                        + Add Condition
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newBranches = [...(data.branches || []), {
                      id: `branch-${Date.now()}`,
                      label: `Branch ${(data.branches || []).length + 1}`,
                      conditions: []
                    }];
                    onUpdateNode(node.id, { branches: newBranches });
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  + Add Branch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Category 2.3: Wait Node Config */}
        {node.type === 'wait' && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Wait Type</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => onUpdateNode(node.id, { waitType: 'duration' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    data.waitType !== 'date' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Duration
                </button>
                <button
                  onClick={() => onUpdateNode(node.id, { waitType: 'date' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    data.waitType === 'date' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Specific Date
                </button>
              </div>
            </div>

            {data.waitType === 'duration' ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-100 outline-none"
                    value={data.durationValue || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateNode(node.id, { durationValue: val ? (isNaN(Number(val)) ? val : Number(val)) : undefined });
                    }}
                  />
                  <select
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-100 outline-none"
                    value={data.durationUnit || 'hours'}
                    onChange={(e) => onUpdateNode(node.id, { durationUnit: e.target.value as any })}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Date & Time</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-100 outline-none"
                    value={data.fixedDate ? new Date(data.fixedDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => onUpdateNode(node.id, { fixedDate: new Date(e.target.value).toISOString() })}
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={data.enableWindow || false}
                  onChange={(e) => onUpdateNode(node.id, { enableWindow: e.target.checked })}
                  className="rounded"
                />
                <span className="text-xs font-bold text-slate-500 uppercase">Enable Delivery Window</span>
              </label>
              {data.enableWindow && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Start Time</span>
                    <input
                      type="time"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm"
                      value={data.windowStart || ''}
                      onChange={(e) => onUpdateNode(node.id, { windowStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">End Time</span>
                    <input
                      type="time"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm"
                      value={data.windowEnd || ''}
                      onChange={(e) => onUpdateNode(node.id, { windowEnd: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Channel Node Config */}
        {node.type === 'channel' && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Distribution Channels</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(CHANNEL_DEFS).map(([key, def]) => {
                  const isSelected = (data.selectedChannels || ['sms']).includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        const current = data.selectedChannels || ['sms'];
                        let next = [];
                        if (isSelected) {
                          next = current.filter(c => c !== key);
                          if (next.length === 0) next = ['sms'];
                        } else {
                          next = [...current, key];
                        }
                        // ✅ Opt-3: Preserve existing content when channels change, but auto-generate for new empty channels
                        const currentContent = data.channelContent || {};
                        const newContent = { ...currentContent };
                        
                        // ✅ Opt-3: If SMS is newly added and has no content, generate default message
                        if (!isSelected && key === 'sms' && (!newContent['sms'] || !newContent['sms'].text || !newContent['sms'].text.trim())) {
                          // Find upstream nodes for default message generation
                          const upstreamSegment = nodes?.find((n: Node) => n.type === 'segment') || null;
                          const upstreamAction = nodes?.find((n: Node) => n.type === 'action') || null;
                          
                          if (upstreamAction) {
                            const actionData = upstreamAction.data as unknown as CampaignNodeData;
                            const offerName = actionData.productName || actionData.offerId || actionData.label || 'the offer';
                            const segmentLabel = upstreamSegment 
                              ? (upstreamSegment.data as unknown as CampaignNodeData).label || 'Exclusive Offer'
                              : 'Exclusive Offer';
                            
                            newContent['sms'] = {
                              ...newContent['sms'],
                              text: `${segmentLabel}: ${offerName}`
                            };
                          }
                        }
                        
                        onUpdateNode(node.id, { 
                          selectedChannels: next,
                          channelContent: newContent
                        });
                        if (!next.includes(activeChannelTab)) setActiveChannelTab(next[0]);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${isSelected
                        ? `${def.bgColor} ${def.color} border-${def.color.split('-')[1]}-200 ring-1`
                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                        }`}
                    >
                      <def.icon size={20} className="mb-1" />
                      <span className="text-[9px] font-bold">{def.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Copilot */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-indigo-600" />
                <h4 className="text-xs font-bold text-indigo-800 uppercase">AI Content Copilot</h4>
              </div>
              <div className="space-y-2">
                <textarea
                  rows={4}
                  className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-100 outline-none"
                  placeholder="AI-generated marketing copy will appear here..."
                  value={data.channelContent?.[activeChannelTab || 'sms']?.text || ''}
                  onChange={(e) => {
                    const currentContent = data.channelContent || {};
                    onUpdateNode(node.id, {
                      channelContent: {
                        ...currentContent,
                        [activeChannelTab || 'sms']: { ...currentContent[activeChannelTab || 'sms'], text: e.target.value }
                      }
                    });
                  }}
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={isAiGenerating}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2Icon size={14} className="animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Generate Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

