import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [role, setRole] = useState('student');
  const [regId, setRegId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5001/api/auth/login', { regId, password });
      if (res.data.role !== role) {
        setError('Invalid role selected for this user');
        return;
      }
      localStorage.setItem('user', JSON.stringify(res.data));
      if (role === 'teacher') {
        navigate('/dashboard');
      } else {
        navigate('/feed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back</h2>
        
        <div className="flex bg-gray-200 rounded-full p-1 mb-6">
          <button
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${role === 'student' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            onClick={() => setRole('student')}
          >
            Student
          </button>
          <button
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${role === 'teacher' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            onClick={() => setRole('teacher')}
          >
            Teacher
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration ID</label>
            <input
              type="text"
              value={regId}
              onChange={(e) => setRegId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. student1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02]"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
