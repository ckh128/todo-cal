'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

// 투두 데이터의 타입을 정의합니다.
type Todo = {
  id: string;
  title: string;
  due_date: string;
  is_done: boolean;
};

export default function Home() {
  /** --- 상태 관리 (State) --- **/
  const [email, setEmail] = useState(''); // 로그인 이메일
  const [password, setPassword] = useState(''); // 로그인 비밀번호
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 여부 체크
  const passwordRef = useRef<HTMLInputElement>(null); // 비밀번호 입력창 접근을 위한 Ref
  const [backgroundImage, setBackgroundImage] = useState(''); // 배경화면 이미지 경로

  // 날짜 관련 상태
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear()); // 현재 표시 중인 년도
  const [month, setMonth] = useState(today.getMonth()); // 현재 표시 중인 월 (0~11)
  const [selectedDate, setSelectedDate] = useState(formatDate(today)); // 사용자가 선택한 날짜 (YYYY-MM-DD)

  // 데이터 리스트 상태
  const [todos, setTodos] = useState<Todo[]>([]); // 선택된 날짜의 할 일 목록
  const [newTitle, setNewTitle] = useState(''); // 새로 만들 할 일의 제목
  const [reading, setReading] = useState(''); // 오늘의 독서 기록 내용
  const [dev, setDev] = useState(''); // 오늘의 개발 기록 내용

  /** --- 유틸리티 함수 --- **/
  // Date 객체를 'YYYY-MM-DD' 형식의 문자열로 변환합니다.
  function formatDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // 해당 월의 달력을 그리기 위해 일자 배열을 생성합니다. (빈 칸 포함)
  function getMonthDays(y: number, m: number) {
    const firstDay = new Date(y, m, 1).getDay(); // 1일의 요일
    const lastDate = new Date(y, m + 1, 0).getDate(); // 해당 월의 마지막 날짜
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null); // 시작 전 빈 칸 추가
    for (let d = 1; d <= lastDate; d++) days.push(d); // 1일부터 마지막 날까지 추가
    return days;
  }

  /** --- Supabase 데이터 연동 함수 --- **/
  
  // 로그인한 유저의 프로필(배경화면 등)을 불러옵니다.
  const loadProfile = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase.from('profiles').select('bg_url').eq('id', userData.user.id).single();
    if (profile?.bg_url) setBackgroundImage(profile.bg_url);
  };

  // 배경화면 주소를 DB에 저장하고 화면을 업데이트합니다.
  const updateBackground = async (url: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setBackgroundImage(url);
    await supabase.from('profiles').upsert({ id: userData.user.id, bg_url: url });
  };

  // 이메일과 비밀번호로 로그인을 시도합니다.
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

  // 선택된 날짜에 해당하는 투두 리스트를 불러옵니다.
  const loadTodos = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: todoData } = await supabase.from('todos')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('due_date', selectedDate)
      .order('created_at');
    if (todoData) setTodos(todoData);
  };

  // 새로운 할 일을 추가합니다.
  const addTodo = async () => {
    if (!newTitle.trim()) return; // 빈 내용 방지
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from('todos').insert({
      title: newTitle,
      user_id: userData.user.id,
      due_date: selectedDate,
      is_done: false
    });

    if (error) alert(error.message);
    else {
      setNewTitle(''); // 입력창 초기화
      loadTodos(); // 목록 갱신
    }
  };

  // 투두의 완료 상태(체크박스)를 반전시킵니다.
  const toggleTodo = async (id: string, currentStatus: boolean) => {
    await supabase.from('todos').update({ is_done: !currentStatus }).eq('id', id);
    loadTodos();
  };

  // 할 일을 삭제합니다.
  const deleteTodo = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) alert('삭제 실패: ' + error.message);
    else loadTodos();
  };

  // 선택된 날짜의 독서 및 개발 기록을 불러옵니다.
  const loadDailyNote = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: note } = await supabase.from('daily_notes')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('date', selectedDate)
      .maybeSingle(); // 데이터가 없어도 에러를 내지 않음
    
    if (note) {
      setReading(note.reading ?? '');
      setDev(note.dev ?? '');
    } else {
      setReading('');
      setDev('');
    }
  };

  // 독서 기록을 저장합니다. (Upsert: 있으면 수정, 없으면 추가)
  const saveReading = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from('daily_notes').upsert({ 
      user_id: userData.user.id, 
      date: selectedDate, 
      reading: reading,
      dev: dev // 개발 기록 데이터 유실 방지
    }, { onConflict: 'user_id,date' });

    if (error) alert('실패: ' + error.message);
    else { alert('독서 기록 저장 완료!'); loadDailyNote(); }
  };

  // 개발 기록을 저장합니다.
  const saveDev = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from('daily_notes').upsert({ 
      user_id: userData.user.id, 
      date: selectedDate, 
      dev: dev,
      reading: reading // 독서 기록 데이터 유실 방지
    }, { onConflict: 'user_id,date' });

    if (error) alert('실패: ' + error.message);
    else { alert('개발 기록 저장 완료!'); loadDailyNote(); }
  };

  // 날짜가 바뀌거나 로그인이 완료되면 데이터를 다시 로드합니다.
  useEffect(() => {
    if (isLoggedIn) {
      loadTodos();
      loadDailyNote();
    }
  }, [selectedDate, isLoggedIn]);

  const days = getMonthDays(year, month);

  /** --- 화면 렌더링 (UI) --- **/
  return (
    <div
      className="min-h-screen p-8 bg-cover bg-center text-gray-900 transition-all duration-500 font-sans"
      style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', backgroundColor: '#f0f2f5' }}
    >
      {/* 1. 로그인 전 화면 */}
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur p-8 rounded-2xl shadow-xl mt-20">
          <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">Daily To-do Login</h1>
          <input className="w-full border p-3 rounded-lg mb-4" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input ref={passwordRef} className="w-full border p-3 rounded-lg mb-6" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && signIn()} />
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition" onClick={signIn}>로그인</button>
        </div>
      ) : (
        /* 2. 로그인 후 메인 대시보드 */
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* 왼쪽 섹션: 독서 및 개발 기록 */}
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

            {/* 중앙 섹션: 달력 */}
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

            {/* 오른쪽 섹션: 투두 리스트 */}
            <div className="bg-white/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-white/20">
              <h2 className="font-bold mb-4 flex items-center gap-2">✅ 할 일 목록</h2>
              
              {/* 할 일 입력창 */}
              <div className="flex gap-2 mb-4">
                <input 
                  className="flex-1 border p-2 rounded-lg text-sm bg-white/50" 
                  placeholder="새 할 일 입력..." 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                />
                <button onClick={addTodo} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm">추가</button>
              </div>

              {/* 할 일 출력 목록 */}
              <ul className="space-y-3">
                {todos.map(todo => (
                  <li key={todo.id} className="flex items-center justify-between p-3 bg-white/30 rounded-xl group">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="w-5 h-5 cursor-pointer" checked={todo.is_done} onChange={() => toggleTodo(todo.id, todo.is_done)} />
                      <span className={todo.is_done ? 'line-through text-gray-400 font-medium' : 'text-gray-700 font-medium'}>{todo.title}</span>
                    </div>
                    {/* 삭제 버튼 */}
                    <button onClick={() => deleteTodo(todo.id)} className="text-gray-300 hover:text-red-500 transition-colors text-sm font-bold px-2">삭제</button>
                  </li>
                ))}
              </ul>
              {todos.length === 0 && <p className="text-gray-400 text-sm text-center mt-4">항목이 없습니다.</p>}
            </div>
          </div>

          {/* 하단 배경화면 선택 플로팅 바 */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 bg-white/90 p-4 rounded-3xl shadow-2xl z-50">
            <span className="text-xs font-bold text-gray-400 ml-2">THEME</span>
            {['/bg/bg1.jpg', '/bg/bg2.jpg', '/bg/bg3.jpg'].map((url, idx) => (
              <button key={url} onClick={() => updateBackground(url)}
                className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm hover:scale-110 active:scale-95 transition-all"
                style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}