'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Todo = {
  id: string;
  title: string;
  due_date: string;
  is_done: boolean;
};

export default function Home() {
  /** [1. 상태 관리] */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // 로그인/회원가입 전환용
  const [backgroundImage, setBackgroundImage] = useState(''); 

  // 섹션 제목 커스텀 (유저별 저장)
  const [title1, setTitle1] = useState('독서 기록');
  const [title2, setTitle2] = useState('개발 기록');

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(formatDate(today));

  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [reading, setReading] = useState('');
  const [dev, setDev] = useState('');

  /** [2. 유틸리티] */
  function formatDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getMonthDays(y: number, m: number) {
    const firstDay = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= lastDate; d++) days.push(d);
    return days;
  }

  /** [3. 데이터 통신 - Supabase] */
  
  // 유저 설정 로드 (배경, 제목들)
  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
      if (profile.bg_url) setBackgroundImage(profile.bg_url);
      if (profile.title_1) setTitle1(profile.title_1);
      if (profile.title_2) setTitle2(profile.title_2);
    }
  };

  // 프로필 업데이트 (배경, 제목 공용)
  const updateProfile = async (updates: { bg_url?: string; title_1?: string; title_2?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({ id: user.id, ...updates });
  };

  // 회원가입 함수
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert("회원가입 에러: " + error.message);
    else alert("인증 이메일을 확인하거나 가입이 완료되었습니다!");
  };

  // 로그인 함수
  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 에러: " + error.message);
    else { setIsLoggedIn(true); loadProfile(); }
  };

  const loadTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: todoData } = await supabase.from('todos').select('*').eq('user_id', user.id).eq('due_date', selectedDate).order('created_at');
    if (todoData) setTodos(todoData);
  };

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('todos').insert({ title: newTitle, user_id: user.id, due_date: selectedDate, is_done: false });
    setNewTitle('');
    loadTodos();
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    await supabase.from('todos').update({ is_done: !currentStatus }).eq('id', id);
    loadTodos();
  };

  const deleteTodo = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('todos').delete().eq('id', id);
    loadTodos();
  };

  const loadDailyNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: note } = await supabase.from('daily_notes').select('*').eq('user_id', user.id).eq('date', selectedDate).maybeSingle();
    if (note) { setReading(note.reading ?? ''); setDev(note.dev ?? ''); }
    else { setReading(''); setDev(''); }
  };

  const saveDailyNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('daily_notes').upsert({ user_id: user.id, date: selectedDate, reading: reading, dev: dev }, { onConflict: 'user_id,date' });
    alert('기록 저장 완료!');
  };

  useEffect(() => {
    if (isLoggedIn) { loadTodos(); loadDailyNote(); }
  }, [selectedDate, isLoggedIn]);

  const days = getMonthDays(year, month);

  /** [4. UI] */
  return (
    <div
      className="min-h-screen p-8 bg-cover bg-center text-gray-900 transition-all duration-500 font-sans flex items-center justify-center"
      style={{ 
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', 
        backgroundColor: '#e5e7eb',
        backgroundAttachment: 'fixed'
      }}
    >
      {!isLoggedIn ? (
        /* ✅ 로그인 / 회원가입 통합 창 */
        <div className="max-w-md w-full bg-white/30 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/40">
          <h1 className="text-3xl font-black text-center mb-8 text-gray-800 tracking-tight">
            {isSignUp ? 'Join Us' : 'Login'}
          </h1>
          <input className="w-full border-none p-4 rounded-2xl mb-4 bg-white/60 focus:bg-white transition outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full border-none p-4 rounded-2xl mb-6 bg-white/60 focus:bg-white transition outline-none" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (isSignUp ? handleSignUp() : handleSignIn())} />
          
          <button className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold hover:bg-black transition shadow-lg mb-4" onClick={isSignUp ? handleSignUp : handleSignIn}>
            {isSignUp ? '회원가입' : '시작하기'}
          </button>
          
          <p className="text-center text-sm font-bold text-gray-600 cursor-pointer hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? '이미 계정이 있나요? 로그인' : '처음이신가요? 회원가입'}
          </p>
        </div>
      ) : (
        /* 메인 대시보드 */
        <div className="max-w-7xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 좌측: 기록 섹션 (제목 커스텀 가능) */}
            <div className="lg:col-span-3 space-y-6">
              {[
                { title: title1, setTitle: setTitle1, content: reading, setContent: setReading, field: 'title_1' },
                { title: title2, setTitle: setTitle2, content: dev, setContent: setDev, field: 'title_2' }
              ].map((section, idx) => (
                <div key={idx} className="bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30">
                  <input 
                    className="bg-transparent font-black text-gray-800 border-none outline-none focus:bg-white/20 rounded px-1 w-full mb-4"
                    value={section.title}
                    onChange={(e) => section.setTitle(e.target.value)}
                    onBlur={() => updateProfile({ [section.field]: section.title })}
                  />
                  <textarea className="w-full h-32 border-none p-3 rounded-2xl bg-white/40 focus:bg-white/60 transition outline-none text-sm" value={section.content} onChange={(e) => section.setContent(e.target.value)} />
                  <button className="w-full mt-3 bg-gray-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-black" onClick={saveDailyNote}>저장</button>
                </div>
              ))}
            </div>

            {/* 중앙: 캘린더 */}
            <div className="lg:col-span-5 bg-white/20 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/40">
              <div className="flex justify-between items-center mb-8">
                <button className="w-10 h-10 flex items-center justify-center bg-white/40 rounded-full hover:bg-white transition" onClick={() => setMonth(m => m === 0 ? 11 : m - 1)}>◀</button>
                <h2 className="font-black text-2xl text-gray-800 tracking-tighter">{year}. {month + 1}</h2>
                <button className="w-10 h-10 flex items-center justify-center bg-white/40 rounded-full hover:bg-white transition" onClick={() => setMonth(m => m === 11 ? 0 : m + 1)}>▶</button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[10px] font-black text-gray-500 mb-2">{d}</div>)}
                {days.map((d, i) => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isSelected = d && selectedDate === dateStr;
                  return (
                    <div key={i} onClick={() => d && setSelectedDate(dateStr)}
                      className={`aspect-square flex items-center justify-center rounded-2xl cursor-pointer text-sm font-bold transition-all ${isSelected ? 'bg-gray-800 text-white scale-110 shadow-lg' : d ? 'hover:bg-white/60 text-gray-700' : ''}`}>
                      {d}
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-center text-[10px] font-bold text-gray-400">Selected: {selectedDate}</p>
            </div>

            {/* 우측: 투두 */}
            <div className="lg:col-span-4 bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30 flex flex-col">
              <h2 className="font-black mb-6 text-gray-800 text-xl tracking-tight">Today's Tasks</h2>
              <div className="flex gap-2 mb-6">
                <input className="flex-1 border-none p-3 rounded-2xl text-sm bg-white/40 focus:bg-white/60 outline-none transition" placeholder="Add task..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} />
                <button onClick={addTodo} className="bg-gray-800 text-white px-5 py-3 rounded-2xl text-xs font-bold hover:bg-black transition">추가</button>
              </div>
              <ul className="space-y-3 overflow-y-auto max-h-[400px]">
                {todos.map(todo => (
                  <li key={todo.id} className="flex items-center justify-between p-4 bg-white/30 rounded-2xl border border-white/20 group hover:bg-white/50 transition">
                    <div className="flex items-center gap-4">
                      <input type="checkbox" className="w-5 h-5 rounded-lg accent-gray-800 cursor-pointer" checked={todo.is_done} onChange={() => toggleTodo(todo.id, todo.is_done)} />
                      <span className={`${todo.is_done ? 'line-through text-gray-400 font-medium' : 'text-gray-800 font-bold'} text-sm`}>{todo.title}</span>
                    </div>
                    <button onClick={() => deleteTodo(todo.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition text-[10px] font-black">DELETE</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 하단 바 (테마 + URL) */}
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/20 backdrop-blur-2xl p-4 rounded-full shadow-2xl border border-white/30 z-50">
            <span className="text-[10px] font-black text-gray-500 ml-2">THEME</span>
            {['/bg/bg1.jpg', '/bg/bg2.jpg', '/bg/bg3.jpg'].map((url) => (
              <button key={url} onClick={() => { setBackgroundImage(url); updateProfile({ bg_url: url }); }}
                className="w-10 h-10 rounded-full border-2 border-white/60 shadow-inner hover:scale-125 transition-all"
                style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover' }} />
            ))}
            <div className="flex items-center gap-2 ml-2 border-l border-white/30 pl-4">
              <input 
                type="text" 
                placeholder="이미지 주소..." 
                className="bg-white/40 border-none rounded-full px-4 py-2 text-[10px] outline-none focus:bg-white/70 w-32 md:w-48 transition font-bold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = e.currentTarget.value;
                    setBackgroundImage(url);
                    updateProfile({ bg_url: url });
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
            <button onClick={() => { supabase.auth.signOut(); setIsLoggedIn(false); }} className="ml-2 text-[10px] font-black text-red-500 hover:text-red-700">LOGOUT</button>
          </div>
        </div>
      )}
    </div>
  );
}