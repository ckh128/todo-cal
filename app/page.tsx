'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

/** [타입 정의] */
type Todo = {
  id: string;
  title: string;
  due_date: string;
  is_done: boolean;
};

export default function Home() {
  /** [1. 상태 관리 - State] */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [backgroundImage, setBackgroundImage] = useState(''); 

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(formatDate(today));

  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [reading, setReading] = useState('');
  const [dev, setDev] = useState('');

  /** [2. 유틸리티 함수] */
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

  /** [3. 데이터 통신 함수 - Supabase 연동] */
  
  // 로그인한 유저의 프로필(배경화면) 로드
  const loadProfile = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase.from('profiles').select('bg_url').eq('id', userData.user.id).single();
    if (profile?.bg_url) setBackgroundImage(profile.bg_url);
  };

  // ✅ 배경화면 업데이트 함수 (친구들이 각자 URL을 넣어도 유저별로 따로 저장됨)
  const updateBackground = async (url: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    
    setBackgroundImage(url); // 내 화면에 즉시 반영
    
    // DB의 profiles 테이블에 내 ID로 배경 URL 저장 (없으면 생성, 있으면 수정)
    const { error } = await supabase.from('profiles').upsert({ 
      id: userData.user.id, 
      bg_url: url 
    });
    
    if (error) alert("배경 저장 실패: " + error.message);
  };

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else { setIsLoggedIn(true); loadProfile(); }
  };

  const loadTodos = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: todoData } = await supabase.from('todos').select('*').eq('user_id', userData.user.id).eq('due_date', selectedDate).order('created_at');
    if (todoData) setTodos(todoData);
  };

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('todos').insert({ title: newTitle, user_id: userData.user.id, due_date: selectedDate, is_done: false });
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: note } = await supabase.from('daily_notes').select('*').eq('user_id', userData.user.id).eq('date', selectedDate).maybeSingle();
    if (note) { setReading(note.reading ?? ''); setDev(note.dev ?? ''); }
    else { setReading(''); setDev(''); }
  };

  const saveReading = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('daily_notes').upsert({ user_id: userData.user.id, date: selectedDate, reading: reading, dev: dev }, { onConflict: 'user_id,date' });
    alert('독서 저장 완료');
  };

  const saveDev = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('daily_notes').upsert({ user_id: userData.user.id, date: selectedDate, dev: dev, reading: reading }, { onConflict: 'user_id,date' });
    alert('개발 저장 완료');
  };

  useEffect(() => {
    if (isLoggedIn) { loadTodos(); loadDailyNote(); }
  }, [selectedDate, isLoggedIn]);

  const days = getMonthDays(year, month);

  /** [4. 화면 렌더링 - UI] */
  return (
    <div
      className="min-h-screen p-8 bg-cover bg-center text-gray-900 transition-all duration-500 font-sans flex items-center justify-center"
      style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', backgroundColor: '#e5e7eb' }}
    >
      {!isLoggedIn ? (
        /* 로그인 화면 */
        <div className="max-w-md w-full bg-white/30 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/40">
          <h1 className="text-3xl font-black text-center mb-8 text-gray-800 tracking-tight">Login</h1>
          <input className="w-full border-none p-4 rounded-2xl mb-4 bg-white/60 focus:bg-white transition outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full border-none p-4 rounded-2xl mb-6 bg-white/60 focus:bg-white transition outline-none" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && signIn()} />
          <button className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold hover:bg-black transition shadow-lg" onClick={signIn}>시작하기</button>
        </div>
      ) : (
        /* 메인 대시보드 화면 */
        <div className="max-w-7xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 좌측: 기록 섹션 */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30">
                <h2 className="font-black mb-4 text-gray-800">📖 Reading</h2>
                <textarea className="w-full h-32 border-none p-3 rounded-2xl bg-white/40 focus:bg-white/60 transition outline-none text-sm" value={reading} onChange={(e) => setReading(e.target.value)} />
                <button className="w-full mt-3 bg-gray-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-black" onClick={saveReading}>저장</button>
              </div>
              <div className="bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30">
                <h2 className="font-black mb-4 text-gray-800">👨‍💻 Dev</h2>
                <textarea className="w-full h-32 border-none p-3 rounded-2xl bg-white/40 focus:bg-white/60 transition outline-none text-sm" value={dev} onChange={(e) => setDev(e.target.value)} />
                <button className="w-full mt-3 bg-gray-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-black" onClick={saveDev}>저장</button>
              </div>
            </div>

            {/* 중앙: 캘린더 섹션 (투명도 높임) */}
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
            </div>

            {/* 우측: 투두 섹션 */}
            <div className="lg:col-span-4 bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30 flex flex-col">
              <h2 className="font-black mb-6 text-gray-800 text-xl tracking-tight">Today's Tasks</h2>
              <div className="flex gap-2 mb-6">
                <input className="flex-1 border-none p-3 rounded-2xl text-sm bg-white/40 focus:bg-white/60 outline-none transition" placeholder="Add task..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} />
                <button onClick={addTodo} className="bg-gray-800 text-white px-5 py-3 rounded-2xl text-xs font-bold hover:bg-black transition">추가</button>
              </div>
              <ul className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
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

          {/* ✅ 하단 테마 변경 바 (URL 입력 기능 포함) */}
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/20 backdrop-blur-2xl p-4 rounded-full shadow-2xl border border-white/30 z-50">
            <span className="text-[10px] font-black text-gray-500 ml-2">THEME</span>
            
            {/* 기본 제공 배경 버튼들 */}
            {['/bg/bg1.jpg', '/bg/bg2.jpg', '/bg/bg3.jpg'].map((url) => (
              <button key={url} onClick={() => updateBackground(url)}
                className="w-10 h-10 rounded-full border-2 border-white/60 shadow-inner hover:scale-125 transition-all"
                style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover' }} />
            ))}

            {/* ✅ 친구가 직접 이미지 주소를 넣을 수 있는 입력창 */}
            <div className="flex items-center gap-2 ml-2 border-l border-white/30 pl-4">
              <input 
                type="text" 
                placeholder="이미지 주소 붙여넣기..." 
                className="bg-white/40 border-none rounded-full px-4 py-2 text-[10px] outline-none focus:bg-white/70 w-32 md:w-48 transition font-bold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateBackground(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <span className="text-[9px] text-gray-500 font-black px-2 py-1 bg-white/40 rounded-lg">ENTER</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}