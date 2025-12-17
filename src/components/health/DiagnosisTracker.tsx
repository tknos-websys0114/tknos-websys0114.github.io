import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Plus, X, Stethoscope, Trash2, Calendar, Activity, Check, AlertCircle } from "lucide-react";
import { db, STORES } from "../../utils/db";

interface DiagnosisLog {
  id: string;
  illnessName: string;
  symptoms: string;
  status: 'treating' | 'recovered';
  startDate: string;
  endDate?: string;
  createdAt: string;
}

interface DiagnosisTrackerProps {
  onBack: () => void;
}

export default function DiagnosisTracker({ onBack }: DiagnosisTrackerProps) {
  const [logs, setLogs] = useState<DiagnosisLog[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLog, setEditingLog] = useState<DiagnosisLog | null>(null);

  // Form State
  const [illnessName, setIllnessName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [status, setStatus] = useState<'treating' | 'recovered'>('treating');
  const [startDate, setStartDate] = useState('');

  const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert(null), 2000);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await db.get<DiagnosisLog[]>(STORES.HEALTH, 'diagnosis_logs');
      if (data) {
        // Sort by date desc
        setLogs(data.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      }
    } catch (error) {
      console.error("Failed to load diagnosis logs", error);
    }
  };

  const resetForm = () => {
    setIllnessName('');
    setSymptoms('');
    setStatus('treating');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEditingLog(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (log: DiagnosisLog) => {
    setIllnessName(log.illnessName);
    setSymptoms(log.symptoms);
    setStatus(log.status);
    setStartDate(log.startDate);
    setEditingLog(log);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!illnessName.trim()) {
      showAlert('error', '请输入疾病名称');
      return;
    }
    if (!startDate) {
      showAlert('error', '请选择开始日期');
      return;
    }

    try {
      let updatedLogs = [...logs];
      
      if (editingLog) {
        // Update existing
        updatedLogs = updatedLogs.map(log => {
          if (log.id === editingLog.id) {
            return {
              ...log,
              illnessName,
              symptoms,
              status,
              startDate,
              // If changing to recovered, set endDate to today if not present?
              // Or keep it simple.
              endDate: status === 'recovered' && !log.endDate ? new Date().toISOString().split('T')[0] : (status === 'treating' ? undefined : log.endDate)
            };
          }
          return log;
        });
        showAlert('success', '记录已更新');
      } else {
        // Create new
        const newLog: DiagnosisLog = {
          id: Date.now().toString(),
          illnessName,
          symptoms,
          status,
          startDate,
          createdAt: new Date().toISOString()
        };
        updatedLogs = [newLog, ...updatedLogs];
        showAlert('success', '记录已添加');
      }

      await db.set(STORES.HEALTH, 'diagnosis_logs', updatedLogs);
      setLogs(updatedLogs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      setShowAddModal(false);
      resetForm();
      
    } catch (error) {
      showAlert('error', '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;

    try {
      const updatedLogs = logs.filter(l => l.id !== id);
      await db.set(STORES.HEALTH, 'diagnosis_logs', updatedLogs);
      setLogs(updatedLogs);
      showAlert('success', '记录已删除');
    } catch (error) {
      showAlert('error', '删除失败');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl flex items-center justify-center text-[#6B7C93] transition-transform active:scale-90 active:bg-white/60"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold text-[#9FA8DA] tracking-[0.2em] uppercase mb-0.5">Medical Records</span>
          <h1 className="text-lg font-black text-[#5C6B7F] tracking-wide">诊断记录</h1>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="w-10 h-10 bg-[#AEC6CF] text-white rounded-2xl flex items-center justify-center shadow-md shadow-[#AEC6CF]/30 transition-transform active:scale-90"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {logs.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 opacity-60">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Stethoscope className="w-10 h-10 text-gray-300" />
             </div>
             <p className="text-sm font-medium text-gray-400">暂无诊断记录</p>
           </div>
        ) : (
           <div className="space-y-4">
             {logs.map(log => (
               <div 
                 key={log.id}
                 onClick={() => handleOpenEdit(log)}
                 className={`group relative bg-white/40 backdrop-blur-md border border-white/50 p-5 rounded-[2rem] text-left transition-transform active:scale-[0.98] overflow-hidden ${log.status === 'recovered' ? 'opacity-70 grayscale-[0.5]' : ''}`}
               >
                 <div className="flex items-start justify-between mb-3">
                   <div>
                     <h3 className="text-lg font-black text-[#5C6B7F] mb-1">{log.illnessName}</h3>
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                       log.status === 'treating' 
                         ? 'bg-[#FFEBEE] text-[#E57373]' 
                         : 'bg-[#E0F2F1] text-[#4DB6AC]'
                     }`}>
                       {log.status === 'treating' ? '治疗中' : '已痊愈'}
                     </span>
                   </div>
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(log.id);
                      }}
                      className="p-2 rounded-xl text-[#B0BEC5] hover:bg-red-50 hover:text-red-400 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
                 
                 {log.symptoms && (
                   <p className="text-xs text-[#7D8CA3] mb-4 line-clamp-2 bg-white/30 p-3 rounded-xl">
                     {log.symptoms}
                   </p>
                 )}
                 
                 <div className="flex items-center gap-4 text-[10px] text-[#9FA8DA] font-bold tracking-wide">
                   <div className="flex items-center gap-1.5">
                     <Calendar className="w-3 h-3" />
                     {formatDate(log.startDate)}
                   </div>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#5C6B7F]/20 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-6">
           <div className="bg-[#FDFBF7] w-full max-w-[400px] h-[85vh] sm:h-auto sm:rounded-[2.5rem] rounded-t-[2.5rem] border border-white/50 shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
              
              {/* Modal Header */}
              <div className="p-6 pb-2 flex justify-between items-center">
                 <div>
                   <h2 className="text-xl font-black text-[#5C6B7F]">
                     {editingLog ? "编辑记录" : "新增记录"}
                   </h2>
                   <p className="text-xs text-[#9FA8DA] mt-0.5">记录您的健康状况</p>
                 </div>
                 <button 
                   onClick={() => setShowAddModal(false)} 
                   className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[#7D8CA3]"
                 >
                   <X className="w-4 h-4" />
                 </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#7D8CA3] uppercase tracking-wider pl-1">病症名称</label>
                    <input
                       type="text"
                       placeholder="例如：感冒"
                       value={illnessName}
                       onChange={(e) => setIllnessName(e.target.value)}
                       className="w-full bg-white border border-[#E0E0E0] p-4 rounded-2xl text-sm font-bold text-[#5C6B7F] placeholder:text-[#D1D5DB] focus:border-[#AEC6CF] focus:outline-none focus:ring-2 focus:ring-[#AEC6CF]/20 transition-all"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#7D8CA3] uppercase tracking-wider pl-1">开始日期</label>
                    <div className="relative">
                      <input
                         type="date"
                         value={startDate}
                         onChange={(e) => setStartDate(e.target.value)}
                         className="w-full bg-white border border-[#E0E0E0] p-4 rounded-2xl text-sm font-bold text-[#5C6B7F] placeholder:text-[#D1D5DB] focus:border-[#AEC6CF] focus:outline-none focus:ring-2 focus:ring-[#AEC6CF]/20 transition-all appearance-none"
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0BEC5] pointer-events-none" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#7D8CA3] uppercase tracking-wider pl-1">主要症状</label>
                    <textarea
                       placeholder="描述您的症状..."
                       value={symptoms}
                       onChange={(e) => setSymptoms(e.target.value)}
                       rows={4}
                       className="w-full bg-white border border-[#E0E0E0] p-4 rounded-2xl text-sm font-medium text-[#5C6B7F] placeholder:text-[#D1D5DB] focus:border-[#AEC6CF] focus:outline-none focus:ring-2 focus:ring-[#AEC6CF]/20 transition-all resize-none"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#7D8CA3] uppercase tracking-wider pl-1">当前状态</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button
                         type="button"
                         onClick={() => setStatus('treating')}
                         className={`p-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                            status === 'treating' 
                            ? 'bg-[#FFEBEE] text-[#E57373] ring-1 ring-[#E57373]/20 shadow-inner' 
                            : 'bg-white border border-[#E0E0E0] text-[#B0BEC5]'
                         }`}
                       >
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-bold">治疗中</span>
                       </button>
                       <button
                         type="button"
                         onClick={() => setStatus('recovered')}
                         className={`p-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                            status === 'recovered' 
                            ? 'bg-[#E0F2F1] text-[#4DB6AC] ring-1 ring-[#4DB6AC]/20 shadow-inner' 
                            : 'bg-white border border-[#E0E0E0] text-[#B0BEC5]'
                         }`}
                       >
                          <Check className="w-4 h-4" />
                          <span className="text-xs font-bold">已痊愈</span>
                       </button>
                    </div>
                 </div>

              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-white/50 backdrop-blur-sm rounded-b-[2.5rem]">
                 <button 
                   onClick={handleSave}
                   className="w-full bg-[#AEC6CF] text-white py-4 rounded-2xl font-bold text-sm tracking-widest uppercase shadow-lg shadow-[#AEC6CF]/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                 >
                    <Check className="w-5 h-5" />
                    保存记录
                 </button>
              </div>

           </div>
        </div>
      )}
      {/* Alert Modal */}
      {alert && alert.show && (
        <div className="fixed top-[90px] inset-x-0 z-[100] flex justify-center pointer-events-none">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0, y: -10 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.9, opacity: 0, y: -10 }}
             className="mx-auto w-fit flex items-center gap-2 px-4 py-3 pointer-events-auto"
             style={{
                background: 'rgba(253, 251, 247, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                borderRadius: '20px',
                color: '#5C6B7F',
                boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
                fontSize: '13px',
                fontWeight: 'bold'
             }}
           >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                  alert.type === 'success' ? 'bg-[#8FBC8F]' : 'bg-[#E57373]'
              }`}>
                  {alert.type === 'success' ? <Check className="w-3 h-3" strokeWidth={3} /> : <X className="w-3 h-3" strokeWidth={3} />}
              </div>
              <span>{alert.message}</span>
           </motion.div>
        </div>
      )}
    </div>
  );
}