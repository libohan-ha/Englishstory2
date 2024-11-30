function App() {
    const [inputValue, setInputValue] = React.useState('');
    const [story, setStory] = React.useState('');
    const [definitions, setDefinitions] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [showStory, setShowStory] = React.useState(true);
    const [words, setWords] = React.useState([]);
    const [showHistory, setShowHistory] = React.useState(false);
    const [history, setHistory] = React.useState([]);
    const [showToast, setShowToast] = React.useState(false);
    const [touchStart, setTouchStart] = React.useState(null);
    const [touchEnd, setTouchEnd] = React.useState(null);
    const [slideProgress, setSlideProgress] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);

    // 加载历史记录
    React.useEffect(() => {
        const savedHistory = localStorage.getItem('storyHistory');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    }, []);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        const newWords = e.target.value
            .split(/[\s,]+/)
            .map(word => word.trim())
            .filter(word => word);
        setWords(newWords);
    };

    const removeWord = (wordToRemove) => {
        const newWords = words.filter(word => word !== wordToRemove);
        setWords(newWords);
        setInputValue(newWords.join(' '));
    };

    const playWordAudio = (word) => {
        const audio = new Audio(`http://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(word)}`);
        audio.play().catch(error => console.error('播放失败:', error));
    };

    const renderDefinitions = () => {
        if (!definitions) return <div className="definitions-content">暂无释义</div>;

        return (
            <div className="definitions-content">
                {definitions.split('\n').map((line, index) => {
                    const match = line.match(/^(\w+)\s+/);
                    if (match) {
                        const word = match[1];
                        return (
                            <div key={index} className="definition-line" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '10px'
                            }}>
                                <button 
                                    onClick={() => playWordAudio(word)}
                                    className="sound-button"
                                    title="点击播放发音"
                                >
                                    🔊
                                </button>
                                <span>{line}</span>
                            </div>
                        );
                    }
                    return <div key={index} className="definition-line">{line}</div>;
                })}
            </div>
        );
    };

    // 处理提示框显示
    const showNotification = () => {
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 2000);
    };

    const saveContent = () => {
        const date = new Date();
        const timestamp = date.toLocaleString('zh-CN');
        const newEntry = {
            id: Date.now(),
            timestamp,
            story,
            definitions,
            words: [...words]
        };

        const updatedHistory = [newEntry, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('storyHistory', JSON.stringify(updatedHistory));
        showNotification();
    };

    const deleteHistoryItem = (id) => {
        const updatedHistory = history.filter(item => item.id !== id);
        setHistory(updatedHistory);
        localStorage.setItem('storyHistory', JSON.stringify(updatedHistory));
    };

    const loadHistoryItem = (item) => {
        setStory(item.story);
        setDefinitions(item.definitions);
        setShowHistory(false);
    };

    const generateStory = async () => {
        if (words.length === 0) {
            setError('请先输入一些单词');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            const storyResponse = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk-346454e8570d46259a3b4641ec7226cf'
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [{
                        role: "user",
                        content: `创作一个非常简短的故事（100字以内），将以下英文单词巧妙融入中文叙述中：${words.join(', ')}。
严格要求：
1. 每个英文单词在故事中必须且只能出现一次
2. 英文单直接使用，不加任何中文翻译
3. 故事要简单有趣，适合儿童阅读
4. 不要在故事结尾添加任何单词释义或解释
5. 故事要完整，但必须控制在100字以内`
                    }]
                })
            });

            const storyData = await storyResponse.json();
            setStory(storyData.choices[0].message.content);

            const definitionsResponse = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk-346454e8570d46259a3b4641ec7226cf'
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [{
                        role: "user",
                        content: `为以下英文单词提供中文释义和音标，每行一个，格式为"单词 [音标] : 释义"。音标要准确：${words.join(', ')}`
                    }]
                })
            });

            const definitionsData = await definitionsResponse.json();
            setDefinitions(definitionsData.choices[0].message.content);

            setInputValue('');
            setWords([]);

        } catch (error) {
            console.error('Error:', error);
            setError('生成内容时出错，请稍后重试。' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const renderStoryWithAudio = () => {
        return (
            <div className="story-content">
                {story || '暂无故事'}
            </div>
        );
    };

    const handleTouchStart = (e) => {
        setTouchStart(e.targetTouches[0].clientX);
        setTouchEnd(null); // 重置结束位置
    };

    const handleTouchMove = (e) => {
        if (!touchStart) return;
        
        e.preventDefault(); // 防止页面滚动
        const currentTouch = e.targetTouches[0].clientX;
        setTouchEnd(currentTouch);
        
        // 计算滑动进度
        const diff = touchStart - currentTouch;
        const containerWidth = e.currentTarget.offsetWidth;
        const progress = (diff / containerWidth) * 100;
        
        // 限制滑动范围
        if (showStory) {
            setSlideProgress(Math.max(0, Math.min(50, progress)));
        } else {
            setSlideProgress(Math.max(-50, Math.min(0, progress)));
        }
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const diff = touchStart - touchEnd;
        const threshold = window.innerWidth * 0.15; // 15% 的滑动阈值
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && showStory) {
                setShowStory(false);
            } else if (diff < 0 && !showStory) {
                setShowStory(true);
            }
        }
        
        // 重置状态
        setTouchStart(null);
        setTouchEnd(null);
        setSlideProgress(0);
    };

    return (
        <div className="container">
            <div className={`toast-notification ${showToast ? 'show' : ''}`}>
                <span className="icon">✓</span>
                保存成功
            </div>
            <h1>Story Vocabulary</h1>
            <div className="subtitle">输入英文单词，生成包含这些单词的有趣故事</div>
            
            <div className="input-section">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="输入多个单词（用空格或逗号分隔）"
                    className="word-input"
                />
                
                <div className="word-tags">
                    {words.map((word, index) => (
                        <span key={index} className="word-tag">
                            {word}
                            <button 
                                onClick={() => removeWord(word)}
                                className="remove-word"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}

            <button 
                onClick={generateStory} 
                disabled={isLoading || words.length === 0}
                className="generate-button"
            >
                {isLoading ? '生成中...' : 'Generate Story'}
            </button>

            {showHistory ? (
                <div className="history-container">
                    <h2>历史记录</h2>
                    {history.length === 0 ? (
                        <p>暂无历史记录</p>
                    ) : (
                        history.map(item => (
                            <div key={item.id} className="history-item">
                                <div className="history-header">
                                    <span className="history-time">{item.timestamp}</span>
                                    <span className="history-words">单词：{item.words.join(', ')}</span>
                                    <div className="history-actions">
                                        <button onClick={() => loadHistoryItem(item)}>查看</button>
                                        <button onClick={() => deleteHistoryItem(item.id)} className="delete-btn">删除</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <button 
                        onClick={() => setShowHistory(false)}
                        className="close-history"
                    >
                        返回
                    </button>
                </div>
            ) : (
                (story || definitions) && (
                    <>
                        <div className="content"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{
                                position: 'relative',
                                overflow: 'hidden',
                                minHeight: '200px',
                                touchAction: 'none' // 防止系统默认滑动行为
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                transform: `translateX(${showStory ? -slideProgress : -50 + slideProgress}%)`,
                                transition: touchStart ? 'none' : 'transform 0.3s ease-out',
                                width: '200%',
                                height: '100%'
                            }}>
                                <div className="story-container" 
                                    style={{ 
                                        width: '50%',
                                        padding: '0 10px',
                                        opacity: showStory ? 1 - (slideProgress / 50) : 0.3 + (slideProgress / 50),
                                        transition: touchStart ? 'none' : 'opacity 0.3s ease-out',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => !touchStart && setShowStory(true)}
                                >
                                    {renderStoryWithAudio()}
                                </div>
                                <div className="definitions-container" 
                                    style={{ 
                                        width: '50%',
                                        padding: '0 10px',
                                        opacity: showStory ? 0.3 + (slideProgress / 50) : 1 - (-slideProgress / 50),
                                        transition: touchStart ? 'none' : 'opacity 0.3s ease-out',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => !touchStart && setShowStory(false)}
                                >
                                    {renderDefinitions()}
                                </div>
                            </div>
                        </div>
                        <div className="tab-buttons">
                            <button 
                                className="tab-button story"
                                onClick={() => setShowStory(true)}
                            >
                                故事
                            </button>
                            <button 
                                className="tab-button definition"
                                onClick={() => setShowStory(false)}
                            >
                                释义
                            </button>
                            <button 
                                className="tab-button save"
                                onClick={saveContent}
                                disabled={!story && !definitions}
                            >
                                保存
                            </button>
                            <button 
                                className="tab-button history"
                                onClick={() => setShowHistory(true)}
                            >
                                历史
                            </button>
                        </div>
                    </>
                )
            )}
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
