import React from 'react';
import { motion } from 'framer-motion';

const SegmentedControl = ({ options, value, onChange, small = false }) => {
    return (
        <div
            className={`relative flex ${small ? 'p-1' : 'p-1.5'} rounded-full shadow-inner border w-fit group/control`}
            style={{
                backgroundColor: 'rgba(30, 31, 34, 0.6)', // More elegant semi-transparent secondary
                borderColor: 'var(--border-subtle)',
                backdropFilter: 'blur(8px)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
            }}
        >
            {options.map((option) => {
                const isActive = option.value === value;

                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`relative ${small ? 'px-4 py-1.5 text-[10px]' : 'px-7 py-2.5 text-xs'} font-extrabold uppercase letter-spacing-wider transition-all duration-300 rounded-full focus:outline-none z-10 flex items-center justify-center`}
                        style={{
                            WebkitTapHighlightColor: 'transparent',
                            color: isActive ? '#FFFFFF' : 'var(--text-dim)',
                            letterSpacing: '0.05em'
                        }}
                    >
                        <motion.span
                            animate={{
                                scale: isActive ? 1.05 : 1,
                                opacity: isActive ? 1 : 0.7
                            }}
                            whileTap={{ scale: 0.95 }}
                            whileHover={!isActive ? { opacity: 1, color: 'var(--text-muted)' } : {}}
                            className="relative z-20"
                        >
                            {option.label}
                        </motion.span>

                        {isActive && (
                            <motion.div
                                layoutId="segmented-indicator"
                                className="absolute inset-0 rounded-full z-0"
                                style={{
                                    background: 'var(--gradient-primary)',
                                    boxShadow: '0 4px 15px var(--primary-glow), inset 0 1px 1px rgba(255,255,255,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 450,
                                    damping: 35
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
