'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

type Todo = {
  id: string;
  title: string;
  due_date: string;
  is_done: boolean;
};

export default function Home() {
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

  const loadProfile = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase.from('profiles').select('bg_url').eq('id', userData.user.id).single();
    if (profile?.bg_url) setBackgroundImage(profile.bg_url);
  };

  const updateBackground = async (url: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setBackgroundImage(url);
    await supabase.from('profiles').upsert({ id: userData.user.id, bg_url: url });
  };

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      alert('로그인 성공!');
      setIsLoggedIn(true);
      loadProfile();
      loadTodos();
      loadDailyNote();
    }
  };

  const loadTodos = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: todoData } = await supabase.from('todos').select('*').eq('user_id', userData.user.id).eq('due_date', selectedDate).order('created_at');
    if (todoData) setTodos(todoData);
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    await supabase.from('todos').update({ is_done: !currentStatus }).eq('id', id);
    loadTodos();
  };

  const loadDailyNote = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: note } = await supabase.from('daily_notes').select('*').eq('user_id', userData.user.id).eq('date', selectedDate).maybeSingle();
    if (note) {
      setReading(note.reading ?? '');
      setDev(note.dev ?? '');
    } else {
      setReading('');
      setDev('');
    }
  };

  const saveReading = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from('daily_notes').upsert({ 
      user_id: userData.user.id, 
      date: selectedDate, 
      reading: reading,
      dev: dev 
    }, { onConflict: 'user_id,date' });

    if (error) alert('실패: ' + error.message);
    else { alert('독서 기록 저장 완료!'); loadDailyNote(); }
  };

  const saveDev = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from('daily_notes').upsert({ 
      user_id: userData.user.id, 
      date: selectedDate, 
      dev: dev,
      reading: reading 
    }, { onConflict: 'user_id,date' });

    if (error) alert('실패: ' + error.message);
    else { alert('개발 기록 저장 완료!'); loadDailyNote(); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadTodos();
      loadDailyNote();
    }
  }, [selectedDate, isLoggedIn]);

  const days = getMonthDays(year, month);

  return (
    <div
      className="min-h-screen p-8 bg-cover bg-center text-gray-900 transition-all duration-500 font-sans"
      style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', backgroundColor: '#f0f2f5' }}
    >
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur p-8 rounded-2xl shadow-xl mt-20">
          <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">Daily To-do Login</h1>
          <input className="w-full border p-3 rounded-lg mb-4" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input ref={passwordRef} className="w-full border p-3 rounded-lg mb-6" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && signIn()} />
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition" onClick={signIn}>로그인</button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-white/20">
                <h2 className="font-bold mb-3 flex items-center gap-2">📖 오늘의 독서</h2>
                <textarea className="w-full h-32 border p-3 rounded-xl bg-white/50" value={reading} onChange={(e) => setReading(e.target.value)} />
                <button className="w-full mt-2 bg-green-600 text-white py-2 rounded-lg text-sm font-bold shadow-md" onClick={saveReading}>독서 저장</button>
              </div>
              <div className="bg-white/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-white/20">
                <h2 className="font-bold mb-3 flex items-center gap-2">👨‍💻 개발 기록</h2>
                <textarea className="w-full h-32 border p-3 rounded-xl bg-white/50" value={dev} onChange={(e) => setDev(e.target.value)} />
                <button className="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold shadow-md" onClick={saveDev}>개발 저장</button>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <button className="p-2 hover:bg-white rounded-full transition" onClick={() => setMonth(m => m === 0 ? 11 : m - 1)}>◀</button>
                <h2 className="font-bold text-xl">{year}년 {month + 1}월</h2>
                <button className="p-2 hover:bg-white rounded-full transition" onClick={() => setMonth(m => m === 11 ? 0 : m + 1)}>▶</button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} className="text-center text-xs text-gray-400 font-bold mb-2">{d}</div>)}
                {days.map((d, i) => (
                  <div key={i} onClick={() => d && setSelectedDate(`${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)}
                    className={`p-3 text-center rounded-xl cursor-pointer transition ${d && selectedDate === `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}` ? 'bg-blue-500 text-white shadow-inner scale-105' : 'hover:bg-blue-50'}`}>
                    {d}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-gray-500 font-bold">선택: {selectedDate}</p>
            </div>

            <div className="bg-white/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-white/20">
              <h2 className="font-bold mb-4 flex items-center gap-2">✅ 할 일 목록</h2>
              <ul className="space-y-3">
                {todos.map(todo => (
                  <li key={todo.id} className="flex items-center gap-3 p-3 bg-white/30 rounded-xl">
                    <input type="checkbox" className="w-5 h-5 cursor-pointer" checked={todo.is_done} onChange={() => toggleTodo(todo.id, todo.is_done)} />
                    <span className={todo.is_done ? 'line-through text-gray-400 font-medium' : 'text-gray-700 font-medium'}>{todo.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="fixed bottom-8 right-8 flex items-center gap-4 bg-white/90 p-4 rounded-3xl shadow-2xl z-50">
            <span className="text-xs font-bold text-gray-400 ml-2">THEME</span>
            {['/bg/bg1.jpg', '/bg/bg2.jpg', '/bg/bg3.jpg'].map((url, idx) => (
              <button key={url} onClick={() => updateBackground(url)}
                className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm hover:scale-110 active:scale-95 transition-all"
                style={{ backgroundColor: idx === 0 ? '#ff8787' : idx === 1 ? '#74c0fc' : '#8ce99a', backgroundImage: `url(${url})`, backgroundSize: 'cover' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}