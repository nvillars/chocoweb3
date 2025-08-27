"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const nameSuffix = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const [loginReadOnly, setLoginReadOnly] = useState(true);
  const { login } = useAuth();
  const toast = useToast();
  const [remember, setRemember] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regReadOnly, setRegReadOnly] = useState(true);
  const [regError, setRegError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      try {
        const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: loginPassword }) });
        if (!res.ok) {
          const j = await res.json().catch(()=>({}));
          toast.push({ message: j?.error || 'Credenciales inválidas' });
          return;
        }
        const user = await res.json();
        login(user.email, user.role || 'user');
        window.location.href = '/';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.push({ message: msg });
      }
    })();
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegError(null);
    if (!firstName.trim() || !lastName.trim()) return setRegError('Por favor ingresa nombres y apellidos');
    if (!regEmail.includes('@')) return setRegError('Correo inválido');
    if (password.length < 6) return setRegError('La contraseña debe tener al menos 6 caracteres');
    if (password !== confirmPassword) return setRegError('Las contraseñas no coinciden');

    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${firstName.trim()} ${lastName.trim()}`, email: regEmail.trim(), password, role: 'user' }) });
      if (res.status === 409) return setRegError('Ya existe un usuario con ese correo');
      if (!res.ok) return setRegError('Error al crear la cuenta');
      const created = await res.json();
      try {
        const r2 = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: regEmail.trim(), password }) });
        if (r2.ok) {
          const u = await r2.json();
          login(u.email, u.role || 'user');
          toast.push({ message: 'Cuenta creada y sesión iniciada' });
          window.location.href = '/';
          return;
        }
      } catch (e) {}
  const createdObj = created as { email?: string; role?: string } | undefined;
  login(createdObj?.email || regEmail.trim(), createdObj?.role || 'user');
      toast.push({ message: 'Cuenta creada y sesión iniciada' });
      window.location.href = '/';
    } catch (err) {
      setRegError('Error al crear la cuenta');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-3">Login</h2>
            <div className="text-sm">
              <a href="#" onClick={(e) => { e.preventDefault(); setShowRegister(true); }} className="hover:underline">Register</a>
            </div>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={submit} className="space-y-4" autoComplete="off">
              <input type="text" name="__autocomplete_username" autoComplete="off" style={{ display: 'none' }} />
              <input type="password" name="__autocomplete_password" autoComplete="off" style={{ display: 'none' }} />
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input name={`login_email_${nameSuffix}`} autoComplete="off" className="form-input" placeholder="correo@dominio.test" value={email} onChange={e => setEmail(e.target.value)} readOnly={loginReadOnly} onFocus={() => setLoginReadOnly(false)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                <input name={`login_password_${nameSuffix}`} autoComplete="new-password" type="password" className="form-input" placeholder="Contraseña" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} readOnly={loginReadOnly} onFocus={() => setLoginReadOnly(false)} />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <input id="remember" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4" />
                  <label htmlFor="remember" className="text-gray-600">Remember me?</label>
                </div>
              </div>

              <div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-3">
                  <span>Login</span>
                </button>
              </div>

              <div className="text-center text-sm text-gray-600">Don&apos;t have an account? <button onClick={() => setShowRegister(true)} className="text-blue-600 underline">Register here</button></div>

              <div className="mt-4 bg-blue-50 border-l-4 border-blue-300 p-4 rounded">
                <div className="text-sm text-blue-900 font-semibold">Demo Admin Account:</div>
                <div className="text-sm text-gray-700 mt-1">Email: <span className="font-medium">admin@ladulceria.test</span></div>
                <div className="text-sm text-gray-700">Password: <span className="font-medium">Admin123!</span></div>
                <div className="mt-3 text-sm text-blue-900 font-semibold">Demo User Account:</div>
                <div className="text-sm text-gray-700 mt-1">Email: <span className="font-medium">user@ladulceria.test</span></div>
                <div className="text-sm text-gray-700">Password: <span className="font-medium">User123!</span></div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRegister(false)} />
          <div className="relative w-full max-w-2xl mx-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-700 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-3"><span className="text-2xl">➕</span> Crear cuenta</h3>
                <button onClick={() => setShowRegister(false)} className="text-white">✕</button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name={`__register_username_${nameSuffix}`} autoComplete="off" style={{ display: 'none' }} />
                <input type="password" name={`__register_password_${nameSuffix}`} autoComplete="off" style={{ display: 'none' }} />
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Nombres</label>
                  <input name={`reg_firstName_${nameSuffix}`} autoComplete="off" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-3 border rounded mt-1" />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Apellidos</label>
                  <input name={`reg_lastName_${nameSuffix}`} autoComplete="off" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-3 border rounded mt-1" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Correo</label>
                  <input name={`reg_email_${nameSuffix}`} autoComplete="off" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-3 border rounded mt-1" readOnly={regReadOnly} onFocus={() => setRegReadOnly(false)} />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input name={`reg_password_${nameSuffix}`} autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded mt-1" readOnly={regReadOnly} onFocus={() => setRegReadOnly(false)} />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
                  <input name={`reg_confirmPassword_${nameSuffix}`} autoComplete="new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 border rounded mt-1" readOnly={regReadOnly} onFocus={() => setRegReadOnly(false)} />
                </div>
                <input type="hidden" name="role" value="user" />
              </div>
              <div className="p-6 border-t flex items-center justify-between">
                <div className="text-sm text-red-600">{regError}</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowRegister(false)} className="px-4 py-2 bg-gray-100 rounded">Cancelar</button>
                  <button onClick={handleRegister} className="px-6 py-2 bg-green-700 text-white rounded">Crear cuenta</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
