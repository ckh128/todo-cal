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

  // 1 & 2. 로그인 함수 (성공 알림 및 Enter 대응)
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      alert('로그인 성공!'); // 로그인 성공 창 띄우기
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

  const loadDailyNote = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: note } = await supabase.from('daily_notes').select('*').eq('user_id', userData.user.id).eq('date', selectedDate).single();
    setReading(note?.reading ?? '');
    setDev(note?.dev ?? '');
  };

  // 3. 개별 저장 함수 (독서)
  const saveReading = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('daily_notes').upsert({ 
      user_id: userData.user.id, 
      date: selectedDate, 
      reading: reading 
    });
    alert('독서 기록이 저장되었습니다.');
  };

  // 3. 개별 저장 함수 (개발)
  const saveDev = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('daily_notes').upsert({ 
      user_id: userData.user.id, 
      date: selectedDate, 
      dev: dev 
    });
    alert('개발 기록이 저장되었습니다.');
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
      className="min-h-screen p-8 bg-cover bg-center text-gray-900 transition-all duration-500"
      style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', backgroundColor: '#f3f4f6' }}
    >
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur p-6 rounded shadow space-y-3">
          <h1 className="text-xl font-bold text-center">나의 기록장</h1>
          <input className="w-full border p-2" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input 
            ref={passwordRef} 
            className="w-full border p-2" 
            placeholder="비밀번호" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && signIn()} // 1. Enter키 대응
          />
          <button className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700" onClick={signIn}>로그인</button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6">
              {/* 3. 독서 저장 따로 */}
              <div className="bg-white/80 backdrop-blur p-4 rounded shadow">
                <h2 className="font-bold mb-2">📚 오늘의 독서</h2>
                <textarea className="w-full h-32 border p-2" value={reading} onChange={(e) => setReading(e.target.value)} />
                <button className="w-full mt-2 bg-green-600 text-white py-1 rounded text-sm" onClick={saveReading}>독서 저장</button>
              </div>
              {/* 3. 개발 저장 따로 */}
              <div className="bg-white/80 backdrop-blur p-4 rounded shadow">
                <h2 className="font-bold mb-2">💻 오늘의 개발기록</h2>
                <textarea className="w-full h-32 border p-2" value={dev} onChange={(e) => setDev(e.target.value)} />
                <button className="w-full mt-2 bg-blue-600 text-white py-1 rounded text-sm" onClick={saveDev}>개발 저장</button>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur p-6 rounded shadow">
              <h2 className="text-center font-bold mb-4">{year}년 {month + 1}월</h2>
              <div className="grid grid-cols-7 gap-1 text-center font-bold">
                {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} className="py-1 text-xs text-gray-500">{d}</div>)}
                {days.map((d, i) => (
                  <div 
                    key={i} 
                    onClick={() => d && setSelectedDate(`${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)}
                    className={`p-2 cursor-pointer rounded ${d && selectedDate.endsWith(`-${String(d).padStart(2,'0')}`) ? 'bg-blue-500 text-white' : 'hover:bg-blue-100'}`}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded shadow">
              <h2 className="font-bold mb-2">✅ 투두</h2>
              <ul className="space-y-2">
                {todos.map(todo => <li key={todo.id} className="border-b pb-1">{todo.title}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}