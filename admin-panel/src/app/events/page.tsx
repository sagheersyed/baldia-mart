'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, CheckCircle, XCircle, RefreshCw, Layers, ListFilter, Tag } from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface ModuleEvent {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  section: 'mart' | 'food' | 'pharma';
  tags: string;
  itemIds: string[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  sortOrder: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<ModuleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<ModuleEvent> | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'mart' | 'food' | 'pharma'>('mart');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableItems, setAvailableItems] = useState<{ id: string; name: string }[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});

  const getEventStatus = (event: ModuleEvent) => {
    if (!event.isActive) return 'Inactive';
    const now = new Date();
    if (event.startDate && new Date(event.startDate) > now) return 'Upcoming';
    if (event.endDate && new Date(event.endDate) < now) return 'Expired';
    return 'Active';
  };

  const filteredEvents = React.useMemo(() => events.filter(e => e.section === activeTab), [events, activeTab]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchItemNames = async (ids: string[], section: 'mart' | 'food' | 'pharma') => {
    if (!ids || ids.length === 0) return;
    try {
      let endpoint = '';
      if (section === 'pharma') {
        endpoint = `${BASE_URL}/pharma/medicines/search?ids=${ids.join(',')}`;
      } else if (section === 'food') {
        endpoint = `${BASE_URL}/menu-items?ids=${ids.join(',')}`;
      } else {
        endpoint = `${BASE_URL}/products?ids=${ids.join(',')}`;
      }
      const res = await fetchWithAuth(endpoint);
      if (!res.ok) return;
      const data = await res.json();
      const items = data.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      const newNames = { ...itemNames };
      items.forEach((item: any) => {
        newNames[item.id] = item.name || item.title || item.id;
      });
      setItemNames(newNames);
    } catch (e) {
      console.error('Failed to fetch item names', e);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${BASE_URL}/module-events?admin=true`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch events'));
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      showToast({ title: getErrorMessage(error, 'Failed to fetch events'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const searchItems = async (q: string) => {
    if (!q || q.length < 2) return;
    try {
      setLoadingItems(true);
      const section = editingEvent?.section || activeTab;
      let endpoint = '';
      if (section === 'pharma') {
        endpoint = `${BASE_URL}/pharma/medicines/search?q=${encodeURIComponent(q)}`;
      } else if (section === 'food') {
        endpoint = `${BASE_URL}/menu-items?search=${encodeURIComponent(q)}`;
      } else {
        endpoint = `${BASE_URL}/products/search?q=${encodeURIComponent(q)}`;
      }
      const res = await fetchWithAuth(endpoint);
      if (!res.ok) return;
      const data = await res.json();
      const items = data.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      setAvailableItems(items.map((item: any) => {
        const name = item.name || item.title || item.id;
        setItemNames(prev => ({ ...prev, [item.id]: name }));
        return { id: item.id, name };
      }));
    } catch (e) {
      console.error('Failed to search items', e);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      setSaving(true);
      const url = editingEvent.id
        ? `${BASE_URL}/module-events/${editingEvent.id}`
        : `${BASE_URL}/module-events`;
      const method = editingEvent.id ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEvent),
      });

      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to save event'));

      setIsModalOpen(false);
      setEditingEvent(null);
      fetchEvents();
      showToast({ title: 'Campaign Event saved successfully', variant: 'success' });
    } catch (error) {
      console.error('Save failed:', error);
      showToast({ title: getErrorMessage(error, 'Failed to save event'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetchWithAuth(`${BASE_URL}/module-events/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to delete event'));
      fetchEvents();
      showToast({ title: 'Event deleted', variant: 'success' });
    } catch (error) {
      console.error('Delete failed:', error);
      showToast({ title: getErrorMessage(error, 'Failed to delete event'), variant: 'error' });
    }
  };

  const toggleItemSelection = (id: string) => {
    if (!editingEvent) return;
    const currentIds = editingEvent.itemIds || [];
    const newIds = currentIds.includes(id)
      ? currentIds.filter(x => x !== id)
      : [...currentIds, id];
    setEditingEvent({ ...editingEvent, itemIds: newIds });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
            <Calendar className="mr-4 text-emerald-600" size={40} />
            Events & Campaigns
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Manage theme-based promotional campaigns and product lists.</p>
        </div>
        <button
          onClick={() => {
            setEditingEvent({
              section: activeTab,
              isActive: true,
              sortOrder: 1,
              title: '',
              description: '',
              imageUrl: '',
              tags: '',
              itemIds: []
            });
            setIsModalOpen(true);
            setSearchQuery('');
            setAvailableItems([]);
          }}
          className="bg-emerald-600 text-white p-4 rounded-2xl font-black flex items-center shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform"
        >
          <Plus size={20} className="mr-2" /> Add New Event
        </button>
      </header>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-8">
        <button onClick={() => setActiveTab('mart')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'mart' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Grocery (Mart)</button>
        <button onClick={() => setActiveTab('food')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'food' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Food / Restaurant</button>
        <button onClick={() => setActiveTab('pharma')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pharma' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Pharma (Medicines)</button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-emerald-600" size={40} /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <div key={event.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group">
              <div className="h-48 relative bg-slate-100 flex items-center justify-center">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Calendar className="text-slate-300" size={48} />
                )}
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute top-4 right-4 flex space-x-1.5 items-center">
                  {(() => {
                    const status = getEventStatus(event);
                    let badgeClass = '';
                    if (status === 'Active') badgeClass = 'bg-emerald-500 text-white';
                    else if (status === 'Upcoming') badgeClass = 'bg-amber-500 text-white';
                    else if (status === 'Expired') badgeClass = 'bg-rose-500 text-white';
                    else badgeClass = 'bg-gray-500 text-white';
                    
                    return (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow ${badgeClass}`}>
                        {status}
                      </span>
                    );
                  })()}
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-white/20 text-white mb-2">
                    {event.section}
                  </span>
                  <h3 className="text-lg font-black">{event.title}</h3>
                  <p className="text-xs opacity-90 line-clamp-1">{event.description}</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {(event.tags || '').split(',').filter(Boolean).map((t, idx) => (
                    <span key={idx} className="flex items-center text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      <Tag size={8} className="mr-1" /> {t}
                    </span>
                  ))}
                </div>
                {(event.startDate || event.endDate) && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl space-y-1">
                    {event.startDate && (
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-600">Start Date:</span>
                        <span className="font-mono text-slate-700">{new Date(event.startDate).toLocaleString()}</span>
                      </div>
                    )}
                    {event.endDate && (
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-600">End Date:</span>
                        <span className="font-mono text-slate-700">{new Date(event.endDate).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 pt-2 border-t">
                  <span>Items: {event.itemIds?.length || 0}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingEvent(event);
                        setIsModalOpen(true);
                        setSearchQuery('');
                        setAvailableItems([]);
                        if (event.itemIds && event.itemIds.length > 0) {
                          fetchItemNames(event.itemIds, event.section);
                        }
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredEvents.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed rounded-[2rem] border-slate-200 text-slate-400">
              <Calendar className="mx-auto mb-4 opacity-50" size={48} />
              <p className="font-semibold text-lg">No campaign events found</p>
              <p className="text-sm mt-1">Create one to list items on customer app main screens!</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900">{editingEvent?.id ? 'Edit Event Campaign' : 'New Event Campaign'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><XCircle /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editingEvent?.title || ''}
                    onChange={e => setEditingEvent({ ...editingEvent!, title: e.target.value })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                    placeholder="e.g. Ramadan Special Campaigns"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Image Banner URL</label>
                  <input
                    type="text"
                    required
                    value={editingEvent?.imageUrl || ''}
                    onChange={e => setEditingEvent({ ...editingEvent!, imageUrl: e.target.value })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Description</label>
                <textarea
                  value={editingEvent?.description || ''}
                  onChange={e => setEditingEvent({ ...editingEvent!, description: e.target.value })}
                  className="w-full p-3 bg-gray-50 border rounded-xl font-bold h-20"
                  placeholder="Tell customers what this campaign is about..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Section</label>
                  <select
                    value={editingEvent?.section}
                    onChange={e => setEditingEvent({ ...editingEvent!, section: e.target.value as any, itemIds: [] })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                  >
                    <option value="mart">Grocery (Mart)</option>
                    <option value="food">Food</option>
                    <option value="pharma">Pharma</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={editingEvent?.tags || ''}
                    onChange={e => setEditingEvent({ ...editingEvent!, tags: e.target.value })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                    placeholder="ramadan, Eid, sale"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={editingEvent?.sortOrder}
                    onChange={e => setEditingEvent({ ...editingEvent!, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={editingEvent?.startDate ? new Date(editingEvent.startDate).toISOString().slice(0, 16) : ''}
                    onChange={e => setEditingEvent({ ...editingEvent!, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={editingEvent?.endDate ? new Date(editingEvent.endDate).toISOString().slice(0, 16) : ''}
                    onChange={e => setEditingEvent({ ...editingEvent!, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Advanced Product Picker */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                <label className="block text-xs font-black text-slate-500 uppercase">Associate Products / Medicines</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      searchItems(e.target.value);
                    }}
                    className="flex-1 p-3 bg-white border rounded-xl font-bold text-sm"
                    placeholder="Search by product name..."
                  />
                  {loadingItems && <RefreshCw className="animate-spin text-slate-400 m-3" />}
                </div>

                {availableItems.length > 0 && (
                  <div className="bg-white border rounded-xl max-h-36 overflow-y-auto divide-y">
                    {availableItems.map(item => {
                      const isSelected = editingEvent?.itemIds?.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItemSelection(item.id)}
                          className={`p-2.5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}
                        >
                          <span className="text-xs font-bold text-slate-700">{item.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {isSelected ? 'Selected' : 'Click to select'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selected items chips */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-black text-slate-400 block">SELECTED ITEMS ({editingEvent?.itemIds?.length || 0})</span>
                  <div className="flex flex-wrap gap-1.5">
                    {editingEvent?.itemIds?.map((id, index) => (
                      <span key={index} className="inline-flex items-center text-[10px] font-bold bg-white border px-2 py-1 rounded-full text-slate-600 shadow-sm">
                        {itemNames[id] || `ID: ${id.slice(0, 8)}...`}
                        <button
                          type="button"
                          onClick={() => toggleItemSelection(id)}
                          className="ml-1.5 text-rose-500 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {!editingEvent?.itemIds?.length && (
                      <span className="text-xs text-slate-400 italic">No products associated yet. Use search above.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  checked={editingEvent?.isActive}
                  onChange={e => setEditingEvent({ ...editingEvent!, isActive: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600"
                />
                <label className="text-sm font-black text-gray-700">Active Campaign</label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg mt-4 shadow-xl shadow-emerald-500/20"
              >
                {saving ? <RefreshCw className="animate-spin mx-auto" /> : 'Save Campaign Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
