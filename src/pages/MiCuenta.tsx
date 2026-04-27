import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { subscribeToNewsletter, unsubscribeFromNewsletter, isSubscribed } from '../lib/chatbot/newsletterService';
import { getLoyaltyByEmail as getLoyaltyAccount, createLoyaltyAccount as joinLoyaltyProgram, deleteLoyaltyAccount as leaveLoyaltyProgram } from '../lib/chatbot/loyaltyService';

export default function MiCuenta() {
  const user = useAuthStore(state => state.user);
  const isAdmin = useAuthStore(state => state.isAdmin);
  const loyaltyAccount = useAuthStore(state => state.loyaltyAccount);
  const setLoyaltyAccount = useAuthStore(state => state.setLoyaltyAccount);
  const setUser = useAuthStore(state => state.setUser);
  const language = useSettingsStore(state => state.language);
  const t = translations[language];

  // Auth state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: ''
  });
  
  // Password change state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Subscriptions state
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfileData({
              fullName: data.displayName || user.displayName || '',
              address: data.address || '',
              city: data.city || '',
              zipCode: data.zipCode || '',
              phone: data.phone || ''
            });
          } else {
            setProfileData(prev => ({ ...prev, fullName: user.displayName || '' }));
          }
        } catch (err) {
          console.error("Error loading profile:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    const loadSubscriptions = async () => {
      if (user?.email) {
        setSubscriptionsLoading(true);
        try {
          const subscribed = await isSubscribed(user.email);
          setNewsletterSubscribed(subscribed);
          
          // El loyaltyAccount ya debería estar cargado por App.tsx, 
          // pero lo forzamos aquí por si acaso es la primera vez
          if (!loyaltyAccount) {
            const loyalty = await getLoyaltyAccount(user.email);
            setLoyaltyAccount(loyalty);
          }
        } catch (err) {
          console.error("Error loading subscriptions:", err);
        } finally {
          setSubscriptionsLoading(false);
        }
      } else {
        setSubscriptionsLoading(false);
      }
    };

    if (user) {
      loadProfile();
      loadSubscriptions();
    }
  }, [user]);

  const handleToggleNewsletter = async () => {
    if (!user?.email) return;
    try {
      if (newsletterSubscribed) {
        await unsubscribeFromNewsletter(user.email);
        setNewsletterSubscribed(false);
        setSuccess('Te has dado de baja de la newsletter correctamente.');
      } else {
        await subscribeToNewsletter(profileData.fullName || user.displayName || 'Usuario', user.email);
        setNewsletterSubscribed(true);
        setSuccess('¡Te has suscrito a la newsletter!');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar suscripción.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleJoinLoyalty = async () => {
    if (!user?.email) return;
    try {
      await joinLoyaltyProgram(profileData.fullName || user.displayName || 'Usuario', user.email);
      const loyalty = await getLoyaltyAccount(user.email);
      setLoyaltyAccount(loyalty);
      setSuccess('¡Bienvenido al Club Fun Fantasy!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al unirse al club.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleLeaveLoyalty = async () => {
    if (!user?.email) return;
    try {
      await leaveLoyaltyProgram(user.email);
      setLoyaltyAccount(null);
      setSuccess('Te has dado de baja del Club Fun Fantasy correctamente.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al darse de baja del club.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        // Create user doc in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email,
          displayName: name,
          role: 'user',
          createdAt: new Date().toISOString()
        });
        // Update local store
        setUser(auth.currentUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      // 1. Update Firebase Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profileData.fullName
        });
      }

      // 2. Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profileData.fullName,
        address: profileData.address,
        city: profileData.city,
        zipCode: profileData.zipCode,
        phone: profileData.phone,
        updatedAt: new Date().toISOString()
      });

      // 3. Update local store
      setUser(auth.currentUser);
      setSuccess('¡Perfil actualizado correctamente!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Error al actualizar el perfil: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser) return;
    
    if (passwords.new !== passwords.confirm) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (passwords.new.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setUpdatingPass(true);
    setError('');
    setSuccess('');

    try {
      // Re-authenticate first (required for password change)
      const credential = EmailAuthProvider.credential(user.email!, passwords.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, passwords.new);
      
      setSuccess('¡Contraseña actualizada con éxito!');
      setPasswords({ current: '', new: '', confirm: '' });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setError('La contraseña actual es incorrecta');
      } else {
        setError('Error al cambiar contraseña: ' + err.message);
      }
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user document exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user doc if it doesn't exist
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'user',
          createdAt: new Date().toISOString()
        });
      }
      
      setUser(user);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Error al iniciar sesión con Google: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (user) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Sidebar / Info */}
          <div className="lg:col-span-1">
            <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/30 text-center sticky top-24 shadow-sm">
              <div className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center text-primary font-black text-3xl mx-auto mb-6 shadow-inner">
                {user.displayName?.[0] || user.email?.[0] || 'U'}
              </div>
              <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
                {user.displayName || 'Usuario'}
              </h2>
              <p className="text-on-surface-variant mb-8 text-sm">{user.email}</p>
              
              <div className="space-y-3">
                {isAdmin && (
                  <a 
                    href="/admin" 
                    className="flex items-center justify-center gap-3 w-full py-4 bg-primary text-on-primary rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-primary/20"
                  >
                    <span className="material-symbols-outlined">dashboard</span>
                    Panel de Administración
                  </a>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-3 w-full py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-error/10 hover:text-error active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">logout</span>
                  {t.account.logout || 'Cerrar Sesión'}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Feedback Messages */}
            {error && (
              <div className="bg-error/10 text-error p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}
            {success && (
              <div className="bg-success/10 text-success p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in">
                <span className="material-symbols-outlined text-xl">check_circle</span>
                {success}
              </div>
            )}

            {/* Profile Settings Form */}
            <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[3rem] border border-outline-variant/30 shadow-sm">
              <h3 className="text-2xl font-headline font-bold mb-8 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">person</span>
                Datos Personales
              </h3>
              
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-4">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                      className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium"
                      placeholder="Ej: Cloud Strife"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-4">Dirección de Envío</label>
                    <input 
                      type="text" 
                      value={profileData.address}
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium"
                      placeholder="Calle, número, piso..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-4">Ciudad</label>
                    <input 
                      type="text" 
                      value={profileData.city}
                      onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                      className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium"
                      placeholder="Midgar"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-4">Código Postal</label>
                    <input 
                      type="text" 
                      value={profileData.zipCode}
                      onChange={(e) => setProfileData({...profileData, zipCode: e.target.value})}
                      className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium"
                      placeholder="30001"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-4">Teléfono de Contacto</label>
                    <input 
                      type="tel" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium"
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={updating}
                    className="px-10 py-4 bg-primary text-on-primary rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                  >
                    {updating ? (
                      <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">save</span>
                        Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Section */}
            <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[3rem] border border-outline-variant/30 shadow-sm">
              <h3 className="text-2xl font-headline font-bold mb-8 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">lock</span>
                Cambiar Contraseña
              </h3>
              
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-4">Contraseña Actual</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-4">Nueva Contraseña</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                      className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-4">Confirmar Nueva Contraseña</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium"
                      placeholder="Repite la contraseña"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={updatingPass}
                    className="px-10 py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-primary hover:text-on-primary transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 group"
                  >
                    {updatingPass ? (
                      <div className="w-5 h-5 border-2 border-primary group-hover:border-on-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">lock_reset</span>
                        Actualizar Contraseña
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Orders History Placeholder */}
            <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[3rem] border border-outline-variant/30 shadow-sm mb-12">
              <h3 className="text-2xl font-headline font-bold mb-8 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">history</span>
                Historial de Pedidos
              </h3>
              
              <div className="text-center py-16 border-2 border-dashed border-outline-variant/30 rounded-[2rem] bg-surface-container/30">
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-outline">shopping_cart</span>
                </div>
                <p className="text-on-surface-variant font-medium">Aún no has realizado ningún pedido.</p>
                <a href="/cartas" className="mt-4 inline-block text-primary font-bold hover:underline">
                  Explora nuestra tienda
                </a>
              </div>
            </div>

            {/* Subscriptions & Loyalty */}
            <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[3rem] border border-outline-variant/30 shadow-sm">
              <h3 className="text-2xl font-headline font-bold mb-8 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">loyalty</span>
                Suscripciones y Fidelidad
              </h3>

              {subscriptionsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Loyalty Club Section */}
                  <div className="p-6 bg-surface-container/30 rounded-[2rem] border border-outline-variant/20">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl">star</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold">Club Fun Fantasy</h4>
                          <p className="text-sm text-on-surface-variant max-w-sm">
                            Gana puntos con cada compra y consigue descuentos exclusivos.
                          </p>
                        </div>
                      </div>
                      
                      {loyaltyAccount ? (
                        <div className="flex flex-col items-end gap-3">
                          <div className="text-center bg-surface-container px-6 py-3 rounded-2xl">
                            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Tus Puntos</p>
                            <p className="text-2xl font-black text-primary">{loyaltyAccount.points}</p>
                          </div>
                          <button 
                            onClick={handleLeaveLoyalty}
                            className="text-xs font-bold text-error/80 hover:text-error transition-colors"
                          >
                            Dejar el club
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={handleJoinLoyalty}
                          className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-95"
                        >
                          Unirse al Club
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Newsletter Section */}
                  <div className="p-6 bg-surface-container/30 rounded-[2rem] border border-outline-variant/20">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl">mark_email_read</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold">Newsletter</h4>
                          <p className="text-sm text-on-surface-variant max-w-sm">
                            Recibe ofertas y noticias. Podrás darte de baja en cualquier momento.
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={handleToggleNewsletter}
                        className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 ${
                          newsletterSubscribed 
                            ? 'bg-error/10 text-error hover:bg-error/20' 
                            : 'bg-primary text-on-primary hover:bg-primary/90'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {newsletterSubscribed ? 'notifications_off' : 'notifications_active'}
                        </span>
                        {newsletterSubscribed ? 'Darse de baja' : 'Suscribirse'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary-container rounded-3xl flex items-center justify-center text-primary mx-auto mb-6 rotate-3 shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined text-4xl filled-icon">person_pin</span>
          </div>
          <h1 className="text-4xl font-headline font-black text-on-background mb-3">
            {isLogin ? '¡Hola de nuevo!' : 'Crea tu cuenta'}
          </h1>
          <p className="text-on-surface-variant">
            {isLogin ? 'Identifícate para gestionar tus pedidos' : 'Únete a nuestra comunidad de coleccionistas'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="bg-surface-container-lowest p-8 md:p-10 rounded-[3rem] border border-outline-variant/30 shadow-2xl shadow-black/5 space-y-6">
          {error && (
            <div className="bg-error/10 text-error p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-4">Nombre Completo</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-medium"
                placeholder="Squall Leonhart"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-4">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-medium"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-4">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-medium"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {isLogin ? 'Entrar' : 'Registrarme'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="bg-surface-container-lowest px-4 text-on-surface-variant font-black">O también</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-surface-container text-on-surface rounded-2xl font-bold flex items-center justify-center gap-4 hover:bg-surface-container-high transition-all active:scale-95 disabled:opacity-50 border border-outline-variant/30"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-on-surface-variant font-medium">
            {isLogin ? '¿No tienes cuenta todavía?' : '¿Ya eres miembro?'}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-primary font-black uppercase tracking-widest text-sm hover:underline"
            >
              {isLogin ? 'Regístrate gratis' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
