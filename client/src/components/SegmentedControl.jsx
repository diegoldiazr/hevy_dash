import React from 'react';
import { motion } from 'framer-motion';

const SegmentedControl = ({ options, value, onChange, small = false }) => {
    return (
        <div
            className={`relative flex ${small ? 'p-1' : 'p-1.5'} rounded-full shadow-inner border w-fit`}
            style={{
                backgroundColor: 'var(--secondary)',
                borderColor: 'var(--border-subtle)'
            }}
        >
            {options.map((option) => {
                const isActive = option.value === value;

                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`relative ${small ? 'px-3 py-1 text-xs' : 'px-6 py-2 text-sm'} font-bold transition-colors duration-200 rounded-full focus:outline-none z-10`}
                        style={{
                            WebkitTapHighlightColor: 'transparent',
                            color: isActive ? '#FFFFFF' : 'var(--text-muted)'
                        }}
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
                                className="absolute inset-0 rounded-full z-0"
                                style={{
                                    backgroundColor: 'var(--primary)',
                                    boxShadow: 'var(--shadow-md)',
                                    boxShadowColor: 'var(--primary-glow)'
                                }}
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
