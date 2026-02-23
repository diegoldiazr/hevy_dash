import React from 'react';
import { motion } from 'framer-motion';

const SegmentedControl = ({ options, value, onChange, small = false }) => {
    return (
        <div className={`relative flex ${small ? 'p-1' : 'p-1.5'} bg-slate-100 dark:bg-zinc-800/50 rounded-full shadow-inner border border-zinc-200/50 dark:border-zinc-700/50 w-fit`}>
            {options.map((option) => {
                const isActive = option.value === value;

                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`relative ${small ? 'px-3 py-1 text-xs' : 'px-6 py-2 text-sm'} font-bold transition-colors duration-200 rounded-full focus:outline-none z-10 ${isActive
                            ? 'text-white'
                            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100'
                            }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <motion.span
                            whileTap={{ scale: 0.95 }}
                            className="relative z-20"
                        >
                            {option.label}
                        </motion.span>

                        {isActive && (
                            <motion.div
                                layoutId="segmented-indicator"
                                className="absolute inset-0 bg-blue-600 dark:bg-indigo-600 rounded-full shadow-md shadow-blue-500/30 dark:shadow-indigo-500/20 z-0"
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 30
                                }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default SegmentedControl;
