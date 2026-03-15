import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Layout, Sparkles, CheckCircle2, X } from 'lucide-react';
import { useTimelineStore } from '../store/useTimelineStore';

interface MemeTemplateProps {
  selectedClipIds: string[];
  onClose: () => void;
}

export interface MemeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  preview: string;
  layouts: {
    position: 'top' | 'bottom' | 'center' | 'split' | 'overlay' | 'corner';
    textSize: number;
    textColor: string;
    textAlign: 'left' | 'center' | 'right';
    backgroundColor?: string;
    opacity?: number;
  };
}

const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: 'impact-top',
    name: 'Impact Top Text',
    description: 'Classic top text meme format',
    icon: '📝',
    preview: '[TEXT]\n[VIDEO]',
    layouts: {
      position: 'top',
      textSize: 48,
      textColor: '#FFFFFF',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)',
      opacity: 100
    }
  },
  {
    id: 'impact-bottom',
    name: 'Impact Bottom Text',
    description: 'Text at bottom with black bar',
    icon: '📄',
    preview: '[VIDEO]\n[TEXT]',
    layouts: {
      position: 'bottom',
      textSize: 48,
      textColor: '#FFFFFF',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)',
      opacity: 100
    }
  },
  {
    id: 'drake-style',
    name: 'Drake Comparison',
    description: 'Two video clips side by side',
    icon: '👥',
    preview: '[VIDEO1] [VIDEO2]',
    layouts: {
      position: 'split',
      textSize: 32,
      textColor: '#FFFFFF',
      textAlign: 'center',
      opacity: 100
    }
  },
  {
    id: 'surprised-pikachu',
    name: 'Surprised Reaction',
    description: 'Center text with reaction overlay',
    icon: '😲',
    preview: '[   CENTER TEXT   ]\n[   VIDEO CLIPS   ]',
    layouts: {
      position: 'center',
      textSize: 42,
      textColor: '#FFFF00',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      opacity: 100
    }
  },
  {
    id: 'corner-watermark',
    name: 'Corner Watermark',
    description: 'Small text in corner with branding',
    icon: '🏷️',
    preview: '[TEXT (corner)]',
    layouts: {
      position: 'corner',
      textSize: 24,
      textColor: '#FFFFFF',
      textAlign: 'right',
      backgroundColor: 'rgba(0,0,0,0.5)',
      opacity: 80
    }
  },
  {
    id: 'overlay-neon',
    name: 'Neon Overlay',
    description: 'Bright neon text overlay effect',
    icon: '💡',
    preview: '[NEON TEXT OVERLAY]',
    layouts: {
      position: 'center',
      textSize: 56,
      textColor: '#00FF00',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
      opacity: 100
    }
  },
  {
    id: 'caption-style',
    name: 'Video Caption',
    description: 'Subtle bottom caption',
    icon: '📺',
    preview: '[VIDEO]\n[small caption text]',
    layouts: {
      position: 'bottom',
      textSize: 28,
      textColor: '#FFFFFF',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      opacity: 90
    }
  },
  {
    id: 'dual-reaction',
    name: 'Dual Reaction',
    description: 'Two videos with text between',
    icon: '💬',
    preview: '[VIDEO1]  [TEXT]  [VIDEO2]',
    layouts: {
      position: 'center',
      textSize: 36,
      textColor: '#FFFFFF',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      opacity: 100
    }
  },
];

export const MemeTemplate = ({ selectedClipIds, onClose }: MemeTemplateProps) => {
  const { applyMemeTemplate } = useTimelineStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleApplyTemplate = (templateId: string) => {
    if (selectedClipIds.length === 0) {
      alert('Please select at least one clip to apply the template');
      return;
    }
    applyMemeTemplate(selectedClipIds, templateId);
    setSelectedTemplate(templateId);
    setTimeout(onClose, 500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-surface border border-border rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/20 text-accent">
                <Smile size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Meme Templates</h2>
                <p className="text-xs text-textDim mt-1">Choose a template to apply to {selectedClipIds.length} selected clip{selectedClipIds.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X size={24} className="text-textDim" />
            </button>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {MEME_TEMPLATES.map((template) => (
              <motion.button
                key={template.id}
                onClick={() => handleApplyTemplate(template.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative p-4 rounded-2xl border-2 transition-all overflow-hidden group ${
                  selectedTemplate === template.id
                    ? 'border-accent bg-accent/20'
                    : 'border-white/10 bg-white/5 hover:border-accent/50 hover:bg-white/10'
                }`}
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="text-4xl mb-3 text-center">{template.icon}</div>
                  <h3 className="font-black text-sm text-white mb-1">{template.name}</h3>
                  <p className="text-xs text-textDim mb-3 line-clamp-2">{template.description}</p>
                  
                  {/* Preview */}
                  <div className="bg-black/40 rounded-lg p-2 mb-3 text-xs text-textDim font-mono text-center h-12 flex items-center justify-center border border-white/5">
                    {template.preview}
                  </div>

                  {/* Apply indicator */}
                  {selectedTemplate === template.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 bg-accent text-black rounded-full p-1"
                    >
                      <CheckCircle2 size={16} />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Selected Template Details */}
          {selectedTemplate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/30 border border-accent/30 rounded-2xl p-6 mb-8"
            >
              {(() => {
                const template = MEME_TEMPLATES.find(t => t.id === selectedTemplate)!;
                return (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles size={20} className="text-accent" />
                      <h3 className="text-lg font-black text-white">{template.name}</h3>
                    </div>
                    <p className="text-sm text-textDim mb-4">{template.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-textDim uppercase font-black text-[10px] mb-1">Text Position</p>
                        <p className="text-white font-mono capitalize">{template.layouts.position}</p>
                      </div>
                      <div>
                        <p className="text-textDim uppercase font-black text-[10px] mb-1">Text Size</p>
                        <p className="text-white font-mono">{template.layouts.textSize}px</p>
                      </div>
                      <div>
                        <p className="text-textDim uppercase font-black text-[10px] mb-1">Text Color</p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border border-white/20"
                            style={{ backgroundColor: template.layouts.textColor }}
                          />
                          <p className="text-white font-mono">{template.layouts.textColor}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-textDim uppercase font-black text-[10px] mb-1">Opacity</p>
                        <p className="text-white font-mono">{template.layouts.opacity}%</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* Features info */}
          <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
            <div className="flex items-start gap-3">
              <Layout size={20} className="text-accent mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-black text-white mb-2">Template Features</h4>
                <ul className="text-xs text-textDim space-y-1 list-disc list-inside">
                  <li>Professional text layouts optimized for social media</li>
                  <li>Automatic positioning and scaling across clips</li>
                  <li>Customizable colors, sizes, and animations</li>
                  <li>One-click application to multiple clips simultaneously</li>
                  <li>Smooth fade-in/fade-out transitions included</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
