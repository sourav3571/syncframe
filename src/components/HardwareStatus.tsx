import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { Cpu, Zap, Activity } from 'lucide-react';

interface Caps {
    cpu_cores: number;
    ram_gb: number;
    gpu_vendor: string;
    recommended_encoder: string;
    proxy_recommended: boolean;
}

export const HardwareStatus = () => {
    const [caps, setCaps] = useState<Caps | null>(null);

    useEffect(() => {
        invoke<Caps>('detect_system_capabilities').then(setCaps);
    }, []);

    if (!caps) return (
        <div className="flex items-center gap-3 bg-background px-6 py-2 rounded-2xl border border-border">
            <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-textDim">Initializing Engine...</span>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card px-8 py-3 rounded-2xl flex gap-10 items-center border border-border shadow-2xl relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-accent" />

            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-surfaceHighlight text-textMain border border-white/5">
                    <Cpu size={16} />
                </div>
                <div>
                    <p className="text-[8px] text-textDim font-black uppercase tracking-tighter">Machine</p>
                    <p className="font-black text-[11px] text-textMain mono">{caps.cpu_cores}T / {caps.ram_gb}GB</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-surfaceHighlight text-accent border border-white/5">
                    <Zap size={16} />
                </div>
                <div>
                    <p className="text-[8px] text-textDim font-black uppercase tracking-tighter">Encoder</p>
                    <p className="font-black text-[11px] text-accent mono uppercase">{caps.recommended_encoder.split('_')[1] || caps.recommended_encoder}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-surfaceHighlight text-textMain border border-white/5">
                    <Activity size={16} />
                </div>
                <div>
                    <p className="text-[8px] text-textDim font-black uppercase tracking-tighter">Performance</p>
                    <p className="font-black text-[11px] text-textMain uppercase italic tracking-widest">
                        {caps.proxy_recommended ? 'Limited' : 'Elite'}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
