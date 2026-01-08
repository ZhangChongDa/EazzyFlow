
import React, { useState, useRef, useEffect } from 'react';
import { editImage, generateMarketingCopy } from '../services/geminiService.ts';
import { Wand2, Image as ImageIcon, Copy, Check, Loader2, Sparkles, Save } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Offer } from '../types';

const ContentStudio: React.FC = () => {
  // Text State
  const [intent, setIntent] = useState('');
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [isCopyLoading, setIsCopyLoading] = useState(false);

  // Image State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  // ✅ Phase 2: Save to Offer
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fix: Declare fileInputRef inside the component to avoid reassignment of the outer constant
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Load Offers on Mount
  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    const data = await dataService.getOffers();
    setOffers(data);
  };

  const handleCopyGenerate = async () => {
    if (!intent) return;
    setIsCopyLoading(true);
    const text = await generateMarketingCopy(intent, 'Professional');
    setGeneratedCopy(text);
    setIsCopyLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setEditedImage(null); // Reset previous edit
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageEdit = async () => {
    if (!selectedImage || !editPrompt) return;
    setIsImageLoading(true);
    // Remove data:image/png;base64, prefix for the API
    const base64Data = selectedImage.split(',')[1];
    const resultBase64 = await editImage(base64Data, editPrompt);
    
    if (resultBase64) {
      setEditedImage(`data:image/png;base64,${resultBase64}`);
    } else {
      alert("Failed to edit image. Ensure you have a valid key and permissions.");
    }
    setIsImageLoading(false);
  };

  // ✅ Save Image to Offer
  const handleSaveToOffer = () => {
    if (!editedImage) {
      alert('Please generate an edited image first');
      return;
    }
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveToOffer = async () => {
    if (!selectedOfferId || !editedImage) return;

    setSaving(true);
    const { error } = await dataService.updateOffer(selectedOfferId, {
      imageUrl: editedImage // In production, upload to CDN first
    });

    if (!error) {
      alert('Image saved to offer successfully!');
      setIsSaveModalOpen(false);
      setSelectedOfferId(null);
    } else {
      alert('Failed to save image to offer');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
       <header>
        <h1 className="text-2xl font-bold text-slate-900">Creative Studio</h1>
        <p className="text-slate-500">Generate high-converting assets with Gemini AI.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Copywriter */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Wand2 size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">AI Copywriter</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Goal / Intent</label>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                rows={3}
                placeholder="e.g. Inform VVIP users about a 50% discount on data roaming..."
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
              />
            </div>
            
            <button 
              onClick={handleCopyGenerate}
              disabled={isCopyLoading || !intent}
              className="flex items-center justify-center w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {isCopyLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Sparkles className="mr-2" size={18} />}
              Generate Copy
            </button>

            {generatedCopy && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-800 text-sm leading-relaxed">{generatedCopy}</p>
                <div className="mt-3 flex justify-end">
                   <button className="text-xs flex items-center text-slate-500 hover:text-indigo-600">
                     <Copy size={14} className="mr-1" /> Copy
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Image Editor */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
              <ImageIcon size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Image Magic Edit</h2>
          </div>

          <div className="space-y-4">
            {/* Upload Area */}
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              {selectedImage ? (
                <img src={selectedImage} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-sm" />
              ) : (
                <div className="py-8">
                  <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                    <ImageIcon size={24} />
                  </div>
                  <p className="text-sm text-slate-500">Click to upload an asset</p>
                </div>
              )}
            </div>

            {/* Edit Controls */}
            {selectedImage && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Edit Prompt (Gemini Flash Image)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    placeholder="e.g. Add a retro filter, remove the background person..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                  />
                  <button 
                    onClick={handleImageEdit}
                    disabled={isImageLoading || !editPrompt}
                    className="px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
                  >
                     {isImageLoading ? <Loader2 className="animate-spin" size={20} /> : 'Go'}
                  </button>
                </div>
              </div>
            )}

            {/* Result Area */}
            {editedImage && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                 <h3 className="text-sm font-medium text-slate-900 mb-3">Result</h3>
                 <img src={editedImage} alt="Edited" className="w-full rounded-lg shadow-md border border-slate-200" />
                 
                 {/* ✅ Save to Offer Button */}
                 <button 
                   onClick={handleSaveToOffer}
                   className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                 >
                   <Save size={18} />
                   Save to Offer
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Save to Offer Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Save Image to Offer</h3>
            <p className="text-sm text-slate-600 mb-4">Select an offer to attach this image:</p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {offers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No offers available. Create one in Product Catalog first.
                </p>
              ) : (
                offers.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => setSelectedOfferId(offer.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOfferId === offer.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{offer.marketingName}</div>
                    <div className="text-xs text-slate-500">
                      Base: {offer.product?.marketingName || 'N/A'} • ${offer.finalPrice}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsSaveModalOpen(false);
                  setSelectedOfferId(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveToOffer}
                disabled={!selectedOfferId || saving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentStudio;
