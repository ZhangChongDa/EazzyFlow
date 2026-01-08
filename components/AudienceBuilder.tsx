import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles, CheckCircle, Loader2, Search, Users } from 'lucide-react';
import { SegmentCriteria, SegmentConditionGroup } from '../hooks/useAudienceEstimator';
import { supabase } from '../services/supabaseClient';
import { useUserTags } from '../hooks/useUserTags';
import { useUserSegments } from '../hooks/useUserSegments';

// ✅ Helper Components
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

// ✅ Main Component Props
interface AudienceBuilderProps {
  criteria: SegmentCriteria | undefined;
  onChange: (newCriteria: SegmentCriteria) => void;
  audienceSize: number | null;
  isEstimating: boolean;
  showVerifyButton?: boolean; // Optional: Show "Verify Users" button
}

export const AudienceBuilder: React.FC<AudienceBuilderProps> = ({
  criteria,
  onChange,
  audienceSize,
  isEstimating,
  showVerifyButton = false
}) => {
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyUsers, setVerifyUsers] = useState<any[]>([]);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const updateCriteria = (key: keyof SegmentCriteria, value: any) => {
    const currentCriteria = criteria || {};
    onChange({
      ...currentCriteria,
      [key]: value
    });
  };

  // Initialize if empty
  if (!criteria?.conditionGroups || criteria.conditionGroups.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Condition Groups */}
      <div className="space-y-4">
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Condition Groups</label>
        {criteria.conditionGroups.map((group: any, groupIdx: number) => (
          <div key={group.id} className="space-y-3">
            {/* Inter-Group Operator */}
            {groupIdx > 0 && (
              <div className="flex items-center justify-center py-1">
                <select
                  className="px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-300 rounded-lg font-bold min-w-[80px]"
                  value={group.groupOperator || 'OR'}
                  onChange={(e) => {
                    const newGroups = [...(criteria.conditionGroups || [])];
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
                      const newGroups = [...(criteria.conditionGroups || [])];
                      newGroups[groupIdx] = { ...group, operator: e.target.value as 'AND' | 'OR' };
                      updateCriteria('conditionGroups', newGroups);
                    }}
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                  <span className="text-[10px] text-indigo-600">(within group)</span>
                </div>
                {criteria.conditionGroups.length > 1 && (
                  <button
                    onClick={() => {
                      const newGroups = criteria.conditionGroups?.filter((_: any, i: number) => i !== groupIdx) || [];
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
                        const newGroups = [...(criteria.conditionGroups || [])];
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
                        const newGroups = [...(criteria.conditionGroups || [])];
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
                                const newGroups = [...(criteria.conditionGroups || [])];
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
                              const newGroups = [...(criteria.conditionGroups || [])];
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
                                const newGroups = [...(criteria.conditionGroups || [])];
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
                              const newGroups = [...(criteria.conditionGroups || [])];
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
                          const newGroups = [...(criteria.conditionGroups || [])];
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
                          const newGroups = [...(criteria.conditionGroups || [])];
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
                          const newGroups = [...(criteria.conditionGroups || [])];
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
                          const newGroups = [...(criteria.conditionGroups || [])];
                          const inputVal = e.target.value.trim();
                          if (inputVal === '' || /^(0(\.\d+)?|1(\.0+)?|0\.\d+)$/.test(inputVal)) {
                            const val = inputVal === '' ? '' : parseFloat(inputVal);
                            if (val === '' || (!isNaN(val) && val >= 0 && val <= 1)) {
                              newGroups[groupIdx].conditions[condIdx] = { ...condition, value: val };
                              updateCriteria('conditionGroups', newGroups);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0 && val <= 1) {
                            const newGroups = [...(criteria.conditionGroups || [])];
                            newGroups[groupIdx].conditions[condIdx] = { ...condition, value: val };
                            updateCriteria('conditionGroups', newGroups);
                          }
                        }}
                      />
                    ) : condition.field === 'app_usage' ? (
                      <AppUsageSelector
                        value={condition.value as string || ''}
                        onChange={(val) => {
                          const newGroups = [...(criteria.conditionGroups || [])];
                          newGroups[groupIdx].conditions[condIdx] = { ...condition, value: val };
                          updateCriteria('conditionGroups', newGroups);
                        }}
                      />
                    ) : condition.field === 'user_tags' ? (
                      <UserTagsSelector
                        value={condition.value as string[] || []}
                        onChange={(val) => {
                          const newGroups = [...(criteria.conditionGroups || [])];
                          newGroups[groupIdx].conditions[condIdx] = { ...condition, value: val };
                          updateCriteria('conditionGroups', newGroups);
                        }}
                        onSelectSegment={(segmentCriteria) => {
                          // ✅ When a Segment is selected, merge its criteria with current criteria
                          const mergedCriteria = { ...criteria, ...segmentCriteria };
                          onChange(mergedCriteria);
                        }}
                      />
                    ) : (
                      <input
                        type={condition.field === 'age' || condition.field === 'arpu_30d' || condition.field === 'created_at' || condition.field === 'balance' ? 'number' : 'text'}
                        placeholder={condition.field === 'created_at' ? 'Days' : 'Value'}
                        className="flex-1 min-w-[80px] max-w-[120px] px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded"
                        value={condition.value || ''}
                        onChange={(e) => {
                          const newGroups = [...(criteria.conditionGroups || [])];
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
                        const newGroups = [...(criteria.conditionGroups || [])];
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
                    const newGroups = [...(criteria.conditionGroups || [])];
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
            const newGroups = [...(criteria.conditionGroups || []), {
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

      {/* ✅ Fix: Display Predicted Audience Size at Bottom */}
      <div className="mt-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Estimated Audience Size</span>
          {isEstimating ? (
            <Loader2 size={14} className="animate-spin text-emerald-600" />
          ) : (
            <Users size={14} className="text-emerald-600" />
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-900">
            {isEstimating ? (
              <span className="text-emerald-600 text-lg">Calculating...</span>
            ) : audienceSize !== null ? (
              audienceSize.toLocaleString()
            ) : (
              <span className="text-emerald-600 text-lg">Configure Criteria</span>
            )}
          </span>
          <span className="text-xs font-medium text-emerald-700">Users</span>
        </div>
        {audienceSize !== null && !isEstimating && (
          <div className="w-full bg-emerald-200/50 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(10, (audienceSize / 1000) * 10))}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Verify Button (Optional) */}
      {showVerifyButton && audienceSize !== null && !isEstimating && (
        <div className="mt-4">
          <button
            onClick={async () => {
              setVerifyLoading(true);
              setVerifyModalOpen(true);
              try {
                const groups = criteria.conditionGroups || [];
                
                if (groups.length === 0) {
                  setVerifyUsers([]);
                  setVerifyLoading(false);
                  return;
                }

                let query = supabase.from('profiles').select('*').limit(50);
                
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
    </div>
  );
};

