import React, { useState, useRef } from 'react';
import { editImage, generateMarketingCopy } from '../services/geminiService';
import { Wand2, Image as ImageIcon, Copy, Check, Loader2, Sparkles } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentStudio;
