import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, Bot } from 'lucide-react';

const Coach = () => {
    const [messages, setMessages] = useState([
        { role: 'system', content: 'Hello! I am your AI Coach. How can I help you with your training today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Prepare context from last few messages to keep conversation history
            // We filter out the initial system greeting for the API context if needed, but here we just send last 5 interactions
            const context = messages.slice(-10).map(m => ({ role: m.role === 'system' ? 'assistant' : m.role, content: m.content }));

            const res = await axios.post('/api/ai/chat', {
                message: input,
                context: context
            });

            const botMessage = { role: 'assistant', content: res.data.message.content || res.data.message };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'system', content: 'Sorry, I encountered an error communicating with the server.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="coach-page">
            <h2>AI Personal Coach</h2>
            <div className="chat-container">
                <div className="messages-list">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message-bubble ${msg.role}`}>
                            <div className="avatar">
                                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                            </div>
                            <div className="content">
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="message-bubble assistant loading">
                            <div className="avatar"><Bot size={18} /></div>
                            <div className="content">Thinking...</div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="input-area">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your workout, form, or nutrition..."
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || !input.trim()}>
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Coach;
