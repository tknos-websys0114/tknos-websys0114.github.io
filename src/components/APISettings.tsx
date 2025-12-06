import { ChevronLeft, RefreshCw, ChevronDown, Trash2, Plus, Sparkles, Server, Key, Box, Activity, Save, Check, X, Settings, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { db, STORES } from "../utils/db";
import { motion, AnimatePresence } from "motion/react";
import SettingsLayout from './SettingsLayout';

interface APIConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
}

interface APISettingsProps {
  onBack: () => void;
}

export default function APISettings({ onBack }: APISettingsProps) {
  const [configName, setConfigName] = useState('默认配置');
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [modelName, setModelName] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [saved, setSaved] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [fetchResult, setFetchResult] = useState<{ success: boolean; message: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  
  const [savedConfigs, setSavedConfigs] = useState<APIConfig[]>([]);
  const [currentConfigIndex, setCurrentConfigIndex] = useState(0);
  const [showConfigSelector, setShowConfigSelector] = useState(false);

  useEffect(() => {
    const loadAPISettings = async () => {
      try {
        const configsStr = await db.get<string>(STORES.API_SETTINGS, 'api_configs');
        if (configsStr) {
          const configs = JSON.parse(configsStr) as APIConfig[];
          setSavedConfigs(configs);
          const currentIndex = parseInt((await db.get<string>(STORES.API_SETTINGS, 'current_config_index')) || '0');
          setCurrentConfigIndex(currentIndex);
          if (configs[currentIndex]) loadConfig(configs[currentIndex]);
        }
      } catch (error) {
        console.error('Failed to load API settings:', error);
      }
    };
    loadAPISettings();
  }, []);

  const loadConfig = (config: APIConfig) => {
    setConfigName(config.name);
    setApiEndpoint(config.baseUrl);
    setApiKey(config.apiKey);
    setModelName(config.modelName);
    setTemperature(config.temperature);
  };

  const handleSave = () => {
    const newConfig: APIConfig = {
      name: configName || '未命名配置',
      baseUrl: apiEndpoint,
      apiKey: apiKey,
      modelName: modelName,
      temperature: temperature
    };

    let updatedConfigs = [...savedConfigs];
    const existingIndex = updatedConfigs.findIndex(c => c.name === newConfig.name);
    
    if (existingIndex >= 0) {
      updatedConfigs[existingIndex] = newConfig;
      setCurrentConfigIndex(existingIndex);
    } else {
      updatedConfigs.push(newConfig);
      setCurrentConfigIndex(updatedConfigs.length - 1);
    }

    setSavedConfigs(updatedConfigs);
    db.set(STORES.API_SETTINGS, 'api_configs', JSON.stringify(updatedConfigs));
    db.set(STORES.API_SETTINGS, 'current_config_index', currentConfigIndex.toString());
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConfigSelect = async (index: number) => {
    setCurrentConfigIndex(index);
    await db.set(STORES.API_SETTINGS, 'current_config_index', index.toString());
    loadConfig(savedConfigs[index]);
    setShowConfigSelector(false);
  };

  const handleFetchModels = async () => {
    if (!apiKey || !apiEndpoint) {
      setFetchResult({ success: false, message: '缺少 Key/URL' });
      return;
    }

    setFetching(true);
    try {
      const response = await fetch(`${apiEndpoint}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const models = data.data.map((model: any) => model.id);
          setAvailableModels(models);
          if (!modelName && models.length > 0) setModelName(models[0]);
          setFetchResult({ success: true, message: `获取 ${models.length} 个模型` });
          setTimeout(() => setFetchResult(null), 2000);
        } else {
          setFetchResult({ success: false, message: '未找到模型' });
        }
      } else {
        setFetchResult({ success: false, message: '获取失败' });
      }
    } catch (error) {
      setFetchResult({ success: false, message: '网络错误' });
    } finally {
      setFetching(false);
    }
  };

  const handleDeleteConfig = (index: number) => {
    const updatedConfigs = savedConfigs.filter((_, i) => i !== index);
    setSavedConfigs(updatedConfigs);
    db.set(STORES.API_SETTINGS, 'api_configs', JSON.stringify(updatedConfigs));
    
    if (index === currentConfigIndex) {
      setCurrentConfigIndex(0);
      db.set(STORES.API_SETTINGS, 'current_config_index', '0');
      if (updatedConfigs.length > 0) {
        loadConfig(updatedConfigs[0]);
      } else {
        setConfigName('默认配置');
        setApiEndpoint('');
        setApiKey('');
        setModelName('');
        setTemperature(0.7);
        setAvailableModels([]);
      }
    } else if (index < currentConfigIndex) {
      const newIndex = currentConfigIndex - 1;
      setCurrentConfigIndex(newIndex);
      db.set(STORES.API_SETTINGS, 'current_config_index', newIndex.toString());
    }
    setDeleteConfirmIndex(null);
  };

  const handleTestConnection = async () => {
    if (!apiKey || !apiEndpoint) {
      setTestResult({ success: false, message: '缺少信息' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          temperature: temperature,
          max_tokens: 10
        })
      });

      if (response.ok) {
        setTestResult({ success: true, message: '连接正常' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
        setTestResult({ success: false, message: `错误: ${msg}` });
      }
    } catch (error) {
      setTestResult({ success: false, message: '连接失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleCreateNewConfig = () => {
    const newConfigName = `配置 ${savedConfigs.length + 1}`;
    setConfigName(newConfigName);
    setApiEndpoint('');
    setApiKey('');
    setModelName('');
    setTemperature(0.7);
    setCurrentConfigIndex(-1); 
    setShowConfigSelector(false);
  };

  return (
    <SettingsLayout title="智能连接配置" onBack={onBack}>
       <div className="space-y-6 text-slate-800">

         {/* Notification */}
         <AnimatePresence>
            {(saved || testResult || fetchResult) && (
               <motion.div 
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="fixed top-24 left-0 right-0 flex justify-center z-[60] pointer-events-none px-4"
               >
                 <div className={`
                   px-5 py-3 border-2 shadow-xl flex items-center gap-3 backdrop-blur-md text-sm font-bold tracking-wide
                   ${(testResult?.success === false || fetchResult?.success === false) ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-slate-800 text-slate-800'}
                 `}>
                   {(testResult?.success === false || fetchResult?.success === false) ? <X className="w-4 h-4" strokeWidth={3} /> : <Check className="w-4 h-4" strokeWidth={3} />}
                   <span>
                      {saved && "配置已保存"}
                      {testResult && testResult.message}
                      {fetchResult && fetchResult.message}
                   </span>
                 </div>
               </motion.div>
            )}
          </AnimatePresence>

          {/* Config Selector Card - Flat Tech Style */}
          <div className="relative z-30">
             <div 
               onClick={() => setShowConfigSelector(!showConfigSelector)}
               className="w-full bg-white p-4 border-2 border-slate-200 border-slate-200 active:border-slate-800 hover:border-slate-800 flex items-center justify-between cursor-pointer transition-all"
             >
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 flex items-center justify-center text-slate-600">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                     <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">当前配置档案</div>
                     <div className="text-base font-bold text-slate-800 font-mono">
                        {currentConfigIndex === -1 ? 'NEW_PROFILE (UNSAVED)' : (savedConfigs[currentConfigIndex]?.name || 'UNNAMED')}
                     </div>
                  </div>
               </div>
               <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showConfigSelector ? 'rotate-180' : ''}`} />
             </div>

             <AnimatePresence>
               {showConfigSelector && (
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-800 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] z-50 max-h-[300px] overflow-y-auto"
                 >
                    {savedConfigs.map((config, index) => (
                       <div 
                          key={index} 
                          className={`p-3 flex justify-between items-center cursor-pointer transition-colors border-b border-slate-100 ${index === currentConfigIndex ? 'bg-slate-50' : 'active:bg-slate-50 hover:bg-slate-50'}`}
                          onClick={() => handleConfigSelect(index)}
                       >
                          <div>
                             <div className={`text-sm font-bold font-mono ${index === currentConfigIndex ? 'text-blue-600' : 'text-slate-700'}`}>{config.name}</div>
                             <div className="text-[10px] text-slate-400 truncate max-w-[200px] font-mono">{config.baseUrl}</div>
                          </div>
                          <button 
                             onClick={(e) => { e.stopPropagation(); setDeleteConfirmIndex(index); }}
                             className="p-2 text-slate-300 active:text-red-500 active:bg-red-50 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    ))}
                    <button 
                       onClick={handleCreateNewConfig}
                       className="w-full p-3 text-center text-sm font-bold text-slate-600 active:bg-slate-100 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                    >
                       <Plus className="w-4 h-4" /> 新建档案
                    </button>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Config Form */}
          <div className="bg-white p-6 border border-slate-200 space-y-6 relative">
             {/* Decorative Corners */}
             <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-slate-300" />
             <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-slate-300" />
             
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">配置名称</label>
                <input 
                   type="text" 
                   value={configName}
                   onChange={(e) => setConfigName(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-slate-800 font-bold focus:border-slate-800 focus:outline-none transition-all font-mono text-sm rounded-none"
                   placeholder="PROFILE_NAME"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <Server className="w-3 h-3" /> 接口地址 (Base URL)
                </label>
                <input 
                   type="text" 
                   value={apiEndpoint}
                   onChange={(e) => setApiEndpoint(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-slate-800 font-medium focus:border-slate-800 focus:outline-none transition-all placeholder:text-slate-300 font-mono text-xs rounded-none"
                   placeholder="https://api.example.com/v1"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <Key className="w-3 h-3" /> 密钥 (API Key)
                </label>
                <input 
                   type="password" 
                   value={apiKey}
                   onChange={(e) => setApiKey(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-slate-800 font-medium focus:border-slate-800 focus:outline-none transition-all placeholder:text-slate-300 font-mono text-xs rounded-none"
                   placeholder="sk-..."
                />
             </div>

             <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Box className="w-3 h-3" /> 模型名称
                   </label>
                   <button 
                      onClick={handleFetchModels}
                      disabled={fetching}
                      className="text-[9px] font-bold border border-blue-200 text-blue-600 px-2 py-0.5 active:bg-blue-50 hover:bg-blue-50 transition-all flex items-center gap-1 disabled:opacity-50 uppercase"
                   >
                      <RefreshCw className={`w-3 h-3 ${fetching ? 'animate-spin' : ''}`} />
                      {fetching ? 'SCANNING...' : 'AUTO SCAN'}
                   </button>
                </div>
                <div className="relative">
                   <input 
                      type="text" 
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-slate-800 font-medium focus:border-slate-800 focus:outline-none transition-all placeholder:text-slate-300 font-mono text-xs rounded-none"
                      placeholder="gpt-3.5-turbo"
                   />
                   {availableModels.length > 0 && (
                      <button 
                         onClick={() => setShowModelSelector(!showModelSelector)}
                         className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:bg-slate-200 rounded-none transition-colors"
                      >
                         <ChevronDown className="w-4 h-4" />
                      </button>
                   )}
                   
                   <AnimatePresence>
                     {showModelSelector && availableModels.length > 0 && (
                        <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-800 shadow-lg z-40 max-h-[200px] overflow-y-auto"
                        >
                           {availableModels.map((model, idx) => (
                              <div 
                                 key={idx}
                                 onClick={() => { setModelName(model); setShowModelSelector(false); }}
                                 className="px-4 py-2 text-xs text-slate-700 active:bg-slate-100 hover:bg-slate-100 cursor-pointer border-b border-slate-100 font-mono last:border-0"
                              >
                                 {model}
                              </div>
                           ))}
                        </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             </div>

             <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-3 h-3" /> 随机性 (Temperature)
                   </label>
                   <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 text-xs font-bold font-mono">
                      {temperature.toFixed(1)}
                   </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-none appearance-none cursor-pointer accent-slate-800 hover:accent-blue-600 transition-all"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest px-1">
                   <span>PRECISE</span>
                   <span>CREATIVE</span>
                </div>
             </div>
          </div>

          {/* Action Bar */}
          <div className="grid grid-cols-3 gap-3 pt-2">
             <button
                onClick={handleTestConnection}
                disabled={testing}
                className="col-span-1 py-3.5 border border-slate-300 bg-white text-slate-600 font-bold text-xs active:border-slate-800 active:text-slate-800 hover:border-slate-800 hover:text-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-wider"
             >
                {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                TEST
             </button>
             <button
                onClick={handleSave}
                className="col-span-2 py-3.5 bg-slate-800 text-white font-bold text-xs active:bg-slate-900 hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 uppercase tracking-wider"
             >
                <Save className="w-3 h-3" />
                保存配置
             </button>
          </div>

          {/* Delete Confirm */}
          <AnimatePresence>
            {deleteConfirmIndex !== null && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] px-6">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border-2 border-slate-800 p-6 w-full max-w-sm shadow-[8px_8px_0px_rgba(0,0,0,0.2)]"
                >
                   <div className="text-center mb-6">
                      <h3 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">确认删除操作</h3>
                      <p className="text-xs font-mono text-slate-500">
                         PROFILE: "{savedConfigs[deleteConfirmIndex]?.name}"
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                         此操作无法撤销。
                      </p>
                   </div>
                   <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteConfirmIndex(null)}
                        className="flex-1 py-3 border border-slate-300 text-slate-600 font-bold text-xs active:bg-slate-50 hover:bg-slate-50 transition-colors uppercase tracking-wider"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(deleteConfirmIndex)}
                        className="flex-1 py-3 bg-red-600 text-white font-bold text-xs active:bg-red-700 hover:bg-red-700 transition-colors shadow-lg shadow-red-200 uppercase tracking-wider"
                      >
                        确认删除
                      </button>
                   </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

       </div>
    </SettingsLayout>
  );
}
