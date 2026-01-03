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
  /* ---------- auth ---------- */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  /* ---------- background ---------- */
  const [backgroundImage, setBackgroundImage] = useState(''); // 초기값 빈 문자열

  /* ---------- calendar ---------- */
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(formatDate(today));

  /* ---------- todos ---------- */
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');

  /* ---------- daily notes ---------- */
  const [reading, setReading] = useState('');
  const [dev, setDev] = useState('');

  /* ---------- utils ---------- */
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

  /* ---------- background logic ---------- */
  const loadProfile = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('bg_url')
      .eq('id', userData.user.id)
      .single();

    if (profile?.bg_url) {
      setBackgroundImage(profile.bg_url);
    }
  };

  const updateBackground = async (url: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    setBackgroundImage(url);
    await supabase.from('profiles').upsert({
      id: userData.user.id,
      bg_url: url,
    });
  };

  /* ---------- auth ---------- */
  const signUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('회원가입 완료 (이메일 인증 필요)');
  };

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      setIsLoggedIn(true);
      loadProfile();
      loadTodos();
      loadDailyNote();
    }
  };

  /* ---------- todos ---------- */
  const loadTodos = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: todoData } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('due_date', selectedDate)
      .order('created_at');

    if (todoData) setTodos(todoData);
  };

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from('todos').insert({
      user_id: userData.user.id,
      title: newTitle,
      due_date: selectedDate,
      is_done: false,
    });

    setNewTitle('');
    loadTodos();
  };

  const toggleTodo = async (todo: Todo) => {
    await supabase
      .from('todos')
      .update({ is_done: !todo.is_done })
      .eq('id', todo.id);

    loadTodos();
  };

  /* ---------- daily notes ---------- */
  const loadDailyNote = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: note } = await supabase
      .from('daily_notes')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('date', selectedDate)
      .single();

    setReading(note?.reading ?? '');
    setDev(note?.dev ?? '');
  };

  const saveDailyNote = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from('daily_notes').upsert({
      user_id: userData.user.id,
      date: selectedDate,
      reading,
      dev,
    });

    alert('독서 / 개발 기록 저장됨');
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
      {!isLoggedIn && (
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur p-6 rounded shadow space-y-3">
          <h1 className="text-xl font-bold">로그인</h1>
          <input className="w-full border p-2" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input ref={passwordRef} className="w-full border p-2" placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-secondary w-full" onClick={signUp}>회원가입</button>
            <button className="btn-primary w-full" onClick={signIn}>로그인</button>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <>
          <div className="grid grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur p-4 rounded shadow">
                <h2 className="font-bold mb-2">오늘의 독서</h2>
                <textarea className="w-full h-32 border p-2" value={reading} onChange={(e) => setReading(e.target.value)} />
              </div>
              <div className="bg-white/80 backdrop-blur p-4 rounded shadow">
                <h2 className="font-bold mb-2">오늘의 개발기록</h2>
                <textarea className="w-full h-32 border p-2" value={dev} onChange={(e) => setDev(e.target.value)} />
                <button className="btn-primary w-full mt-3" onClick={saveDailyNote}>저장</button>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded shadow">
              <div className="flex justify-between mb-3">
                <button onClick={() => setMonth(m => m === 0 ? 11 : m - 1)}>◀</button>
                <h2 className="font-bold">{year}년 {month + 1}월</h2>
                <button onClick={() => setMonth(m => m === 11 ? 0 : m + 1)}>▶</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {days.map((d, i) =>
                  d ? (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(`${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)}
                      className={`p-2 cursor-pointer rounded ${selectedDate === `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}` ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                    >
                      {d}
                    </div>
                  ) : <div key={i} />
                )}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded shadow">
              <h2 className="font-bold mb-2">투두</h2>
              <div className="flex gap-2 mb-3">
                <input className="flex-1 border p-2" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} />
                <button className="btn-primary" onClick={addTodo}>추가</button>
              </div>
              <ul className="space-y-2">
                {todos.map(todo => (
                  <li key={todo.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={todo.is_done} onChange={() => toggleTodo(todo)} />
                    <span className={todo.is_done ? 'line-through text-gray-400' : ''}>{todo.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 수정된 배경화면 선택기 위치: 오른쪽 하단 z-index 추가 */}
          <div className="fixed bottom-10 right-10 flex gap-3 bg-white/90 p-3 rounded-xl shadow-2xl z-50 border border-gray-200">
            <span className="text-xs font-bold self-center mr-2">배경 변경:</span>
            {['/bg/bg1.jpg', '/bg/bg2.jpg', '/bg/bg3.jpg'].map((url, idx) => (
              <button
                key={url}
                onClick={() => updateBackground(url)}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:scale-110 transition-transform shadow-sm"
                style={{ 
                  backgroundImage: `url(${url})`, 
                  backgroundSize: 'cover',
                  backgroundColor: idx === 0 ? 'red' : idx === 1 ? 'blue' : 'green' // 이미지 없을 때 대비 색상
                }}
                title={`배경 ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}