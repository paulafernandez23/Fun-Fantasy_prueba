import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { translations } from '../lib/translations';
import { getLoyaltyByEmail, addPoints, LoyaltyAccount, getLoyaltyConfig, LoyaltyConfig, DEFAULT_LOYALTY_CONFIG } from '../lib/chatbot/loyaltyService';

export default function Carrito() {
  const currencySymbol = useSettingsStore(state => state.currencySymbol);
  const exchangeRate = useSettingsStore(state => state.exchangeRate);
  const language = useSettingsStore(state => state.language);
  const t = translations[language];

  const user = useAuthStore(state => state.user);
  const loyaltyAccount = useAuthStore(state => state.loyaltyAccount);
  const items = useCartStore(state => state.items);
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const total = useCartStore(state => state.getTotal());
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const clearCart = useCartStore(state => state.clearCart);

  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isGuest, setIsGuest] = useState(true);
  const [saveCardInfo, setSaveCardInfo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Cart, 2: Shipping, 3: Payment

  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: ''
  });

  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG);
  const [redeemPoints, setRedeemPoints] = useState<number>(0);

  useEffect(() => {
    const loadData = async () => {
      // Cargar configuración de lealtad (público)
      const config = await getLoyaltyConfig();
      setLoyaltyConfig(config);

      if (user) {
        setIsGuest(false);
        try {
          // 1. Prioridad: Cargar desde el perfil del usuario (Colección 'users')
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.address || data.city || data.phone) {
              setShippingDetails({
                fullName: data.displayName || user.displayName || '',
                address: data.address || '',
                city: data.city || '',
                zipCode: data.zipCode || '',
                phone: data.phone || ''
              });
            } else {
               setShippingDetails(prev => ({
                ...prev,
                fullName: data.displayName || user.displayName || prev.fullName
              }));
            }
          }

          // Intentar cargar desde el último pedido si la dirección sigue vacía
          if (!shippingDetails.address) {
            const q = query(
              collection(db, 'orders'),
              where('user_id', '==', user.uid),
              orderBy('created_at', 'desc'),
              limit(1)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const lastOrder = querySnapshot.docs[0].data();
              if (lastOrder.shipping_details) {
                setShippingDetails(lastOrder.shipping_details);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setIsGuest(true);
      }
    };

    loadData();
  }, [user]);

  const shippingCost = items.length > 0 ? 4.99 : 0;
  const convertedTotal = (total * exchangeRate);
  const convertedShipping = (shippingCost * exchangeRate);
  
  
  // Puntos generados dinámicamente
  const pointsEarned = Math.floor(total * loyaltyConfig.pointsPerEuro);
  
  // Cálculo de descuento dinámico (ratio = rewardAmount / pointsToRedeem)
  const discountInBaseCurrency = (redeemPoints / (loyaltyConfig.pointsToRedeem || 1)) * loyaltyConfig.rewardAmount;
  const discountConverted = discountInBaseCurrency * exchangeRate;
  
  const finalTotal = convertedTotal + convertedShipping - discountConverted;

  const handleRedeemPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value) || 0;
    // No puede usar puntos negativos
    if (value < 0) value = 0;
    
    // No puede usar más puntos de los que tiene
    const maxAvailable = loyaltyAccount?.points || 0;
    
    // No puede usar más puntos que el total a pagar (basado en el valor del punto)
    const baseFinalTotal = total + shippingCost;
    // Puntos necesarios para cubrir el total = (total / rewardAmount) * pointsToRedeem
    const maxApplicable = Math.floor((baseFinalTotal / (loyaltyConfig.rewardAmount || 1)) * loyaltyConfig.pointsToRedeem);
    
    const maxAllowed = Math.min(maxAvailable, maxApplicable);
    
    if (value > maxAllowed) value = maxAllowed;
    
    // Opcional: restringir a múltiplos de 10 o 50 si se prefiere. Aquí permitimos exactos.
    setRedeemPoints(value);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!termsAccepted) {
      alert("Debes aceptar los Términos y Condiciones para realizar el pedido.");
      return;
    }
    setIsProcessing(true);
    
    try {
      await addDoc(collection(db, 'orders'), {
        items: items.map(i => ({
          id: i.id,
          title: i.title,
          quantity: i.quantity,
          price: i.price,
          selectedSize: i.selectedSize || null
        })),
        shipping_details: shippingDetails,
        total: (total + shippingCost - discountInBaseCurrency),
        currency: currencySymbol,
        payment_method: paymentMethod,
        save_card: paymentMethod === 'card' ? saveCardInfo : false,
        checkout_type: isGuest ? 'guest' : 'user',
        user_id: user?.uid || null,
        created_at: new Date().toISOString(),
        status: 'Pendiente',
        points_earned: pointsEarned,
        points_redeemed: redeemPoints
      });
      
      // Actualizar puntos del usuario si es miembro del club
      if (loyaltyAccount && user?.email) {
        // Restar los usados y sumar los ganados
        const netPoints = pointsEarned - redeemPoints;
        if (netPoints !== 0) {
          await addPoints(user.email, netPoints);
        }
      }

      setIsProcessing(false);
      setCheckoutSuccess(true);
      clearCart();
    } catch (e: any) {
      console.error('Error processing order:', e);
      setIsProcessing(false);
    }
  };

  if (checkoutSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
          <span className="material-symbols-outlined text-5xl">check_circle</span>
        </div>
        <h1 className="font-headline text-4xl font-black text-on-background mb-4">¡Pedido Completado!</h1>
        <p className="text-on-surface-variant text-lg mb-12">
          Gracias por tu compra. Hemos recibido tu pedido y estamos preparándolo con la magia de los cristales.
        </p>
        {loyaltyAccount && pointsEarned > 0 && (
          <div className="bg-secondary/10 text-secondary p-6 rounded-2xl mb-12 inline-block">
            <p className="font-bold text-xl flex items-center gap-2 justify-center">
              <span className="material-symbols-outlined">stars</span>
              ¡Has ganado {pointsEarned} puntos!
            </p>
            <p className="text-sm mt-1 opacity-80">Se han añadido a tu cuenta de Club Fun Fantasy.</p>
          </div>
        )}
        <Link to="/" className="inline-flex items-center justify-center px-10 py-4 bg-primary text-on-primary rounded-2xl font-bold hover:scale-105 transition-all shadow-lg">
          {t.common.backToHome}
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full min-h-[80vh]">
      {/* Progress Stepper */}
      {items.length > 0 && !checkoutSuccess && (
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative flex justify-between">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-surface-container-highest -translate-y-1/2 z-0"></div>
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500" 
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            ></div>

            {[
              { step: 1, label: 'Carrito', icon: 'shopping_cart' },
              { step: 2, label: 'Envío', icon: 'local_shipping' },
              { step: 3, label: 'Pago', icon: 'payments' }
            ].map((s) => (
              <div key={s.step} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${
                    currentStep >= s.step 
                      ? 'bg-primary border-primary text-on-primary shadow-lg scale-110' 
                      : 'bg-surface-container-highest border-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <span className={`text-xs font-bold mt-2 ${currentStep >= s.step ? 'text-primary' : 'text-on-surface-variant opacity-50'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-10">
            <h1 className="font-headline text-4xl font-black text-on-background tracking-tight">
              {currentStep === 1 && t.cart.title}
              {currentStep === 2 && "Datos de Envío"}
              {currentStep === 3 && "Método de Pago"}
            </h1>
            {currentStep === 1 && <span className="bg-surface-container-highest px-4 py-1 rounded-full text-sm font-bold">{cartCount} artículos</span>}
          </div>

          {items.length === 0 ? (
            <div className="bg-surface-container-lowest p-16 rounded-[3rem] border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-outline">shopping_cart_off</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">{t.cart.empty}</h3>
              <p className="text-on-surface-variant mb-10 max-w-sm">Parece que aún no has añadido ninguna reliquia a tu colección.</p>
              <Link to="/cartas" className="px-10 py-4 bg-primary text-on-primary rounded-2xl font-bold hover:shadow-lg transition-all transform hover:-translate-y-1"> 
                Explorar Cartas 
              </Link>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              {/* STEP 1: REVIEW ITEMS */}
              {currentStep === 1 && (
                <>
                  {items.map((item) => (
                    <div key={item.cartItemId} className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/20 flex flex-col sm:flex-row gap-6 items-center group transition-all hover:shadow-md">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 bg-surface-container flex items-center justify-center p-3 relative">
                        <img src={item.image_url || `https://picsum.photos/seed/card${item.id}/200/300`} alt={item.title} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-grow text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div>
                            <h3 className="font-headline font-bold text-xl">{item.title}</h3>
                            {item.selectedSize && (
                              <span className="inline-flex mt-1 px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-md uppercase tracking-wider">
                                Talla: {item.selectedSize}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-2xl text-primary">{currencySymbol}{(item.price * exchangeRate * item.quantity).toFixed(2)}</p>
                            <p className="text-xs text-on-surface-variant">{currencySymbol}{(item.price * exchangeRate).toFixed(2)} c/u</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6">
                          <div className="flex items-center bg-surface-container rounded-2xl p-1 border border-outline-variant/30">
                            <button 
                              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} 
                              className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-highest rounded-xl transition-all"
                            >
                              <span className="material-symbols-outlined text-lg">remove</span>
                            </button>
                            <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} 
                              className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-highest rounded-xl transition-all"
                            >
                              <span className="material-symbols-outlined text-lg">add</span>
                            </button>
                          </div>
                          <button 
                            onClick={() => removeItem(item.cartItemId)} 
                            className="flex items-center gap-2 text-error font-bold text-sm hover:bg-error/10 px-4 py-2 rounded-xl transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center mt-8">
                    <button 
                      onClick={clearCart}
                      className="text-on-surface-variant font-bold text-sm hover:text-error transition-colors flex items-center gap-2 px-4"
                    >
                      <span className="material-symbols-outlined text-lg">delete_sweep</span>
                      Vaciar Carrito
                    </button>
                    
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="px-10 py-4 bg-primary text-on-primary rounded-2xl font-bold hover:shadow-lg transition-all flex items-center gap-2 group"
                    >
                      Siguiente: Envío
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: SHIPPING FORM */}
              {currentStep === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">Nombre Completo</label>
                        <input 
                          type="text"
                          required
                          value={shippingDetails.fullName}
                          onChange={(e) => setShippingDetails({...shippingDetails, fullName: e.target.value})}
                          className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary outline-none transition-all"
                          placeholder="Ej: Cloud Strife"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">Dirección</label>
                        <input 
                          type="text"
                          required
                          value={shippingDetails.address}
                          onChange={(e) => setShippingDetails({...shippingDetails, address: e.target.value})}
                          className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary outline-none transition-all"
                          placeholder="Calle, número, piso..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">Ciudad</label>
                        <input 
                          type="text"
                          required
                          value={shippingDetails.city}
                          onChange={(e) => setShippingDetails({...shippingDetails, city: e.target.value})}
                          className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary outline-none transition-all"
                          placeholder="Midgar"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">Código Postal</label>
                        <input 
                          type="text"
                          required
                          value={shippingDetails.zipCode}
                          onChange={(e) => setShippingDetails({...shippingDetails, zipCode: e.target.value})}
                          className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary outline-none transition-all"
                          placeholder="30001"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">Teléfono de contacto</label>
                        <input 
                          type="tel"
                          required
                          value={shippingDetails.phone}
                          onChange={(e) => setShippingDetails({...shippingDetails, phone: e.target.value})}
                          className="w-full bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary outline-none transition-all"
                          placeholder="+34 600 000 000"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-8">
                    <button 
                      onClick={() => setCurrentStep(1)}
                      className="text-on-surface-variant font-bold text-sm hover:text-primary transition-colors flex items-center gap-2 px-4"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                      Volver al Carrito
                    </button>
                    
                    <button 
                      disabled={!shippingDetails.fullName || !shippingDetails.address || !shippingDetails.city || !shippingDetails.zipCode || !shippingDetails.phone}
                      onClick={() => setCurrentStep(3)}
                      className="px-10 py-4 bg-primary text-on-primary rounded-2xl font-bold hover:shadow-lg transition-all flex items-center gap-2 group disabled:opacity-50"
                    >
                      Siguiente: Pago
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PAYMENT & FINAL SUMMARY */}
              {currentStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                  {/* Checkout Options (Guest vs Account) */}
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30">
                    <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4">Confirmar Identidad</h3>
                    <div className="flex bg-surface-container rounded-2xl p-1">
                      <button 
                        onClick={() => setIsGuest(true)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isGuest ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        Invitado
                      </button>
                      <button 
                        onClick={() => setIsGuest(false)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isGuest ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        Con mi cuenta
                      </button>
                    </div>
                  </div>

                  {/* Payment Methods Selection */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/30">
                    <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-6">Método de Pago</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'card', label: 'Tarjeta', icon: 'credit_card' },
                        { id: 'paypal', label: 'PayPal', icon: 'payments' },
                        { id: 'bizum', label: 'Bizum', icon: 'smartphone' }
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                            paymentMethod === method.id 
                              ? 'border-primary bg-primary/5 shadow-md' 
                              : 'border-outline-variant/30 hover:border-outline-variant'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            paymentMethod === method.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            <span className="material-symbols-outlined">{method.icon}</span>
                          </div>
                          <span className={`font-bold text-sm ${paymentMethod === method.id ? 'text-primary' : 'text-on-surface'}`}>
                            {method.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'card' && (
                      <div className="mt-6 p-4 bg-surface-container rounded-2xl animate-in fade-in duration-300">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={saveCardInfo}
                            onChange={(e) => setSaveCardInfo(e.target.checked)}
                            className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium">Guardar datos para futuras compras</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-8">
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="text-on-surface-variant font-bold text-sm hover:text-primary transition-colors flex items-center gap-2 px-4"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                      Volver al Envío
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="w-full lg:w-[400px] shrink-0">
          <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/30 sticky top-24 shadow-sm space-y-8">
            <div>
              <h2 className="font-headline font-bold text-2xl mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Resumen
              </h2>
              
              <div className="space-y-4 font-medium">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="text-on-surface">{currencySymbol}{convertedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Envío</span>
                  <span className="text-on-surface">{currencySymbol}{convertedShipping.toFixed(2)}</span>
                </div>
                
                {/* Sección de Fidelidad (Club Fun Fantasy) */}
                <div className="pt-4 border-t border-outline-variant/30">
                  <div className="flex items-center justify-between mb-3 text-secondary font-bold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">stars</span>
                      Club Fun Fantasy
                    </span>
                  </div>

                  {/* Puntos que se ganarán con esta compra (Para todos) */}
                  <div className="mb-4 bg-secondary/5 p-3 rounded-xl border border-secondary/10 text-center">
                    <p className="text-xs text-on-surface-variant font-medium">
                      Ganarás <span className="text-secondary font-bold">{pointsEarned} puntos</span> con esta compra
                    </p>
                  </div>

                  {loyaltyAccount ? (
                    <>
                      <p className="text-xs text-on-surface-variant mb-2">
                        Tienes <b>{loyaltyAccount.points} puntos</b>. 
                        Canjea {loyaltyConfig.pointsToRedeem} por {currencySymbol}{(loyaltyConfig.rewardAmount * exchangeRate).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          min="0"
                          max={Math.min(loyaltyAccount.points, Math.floor((total + shippingCost) * 10))}
                          value={redeemPoints || ''}
                          onChange={handleRedeemPointsChange}
                          placeholder="0"
                          className="flex-grow bg-surface-container px-4 py-2 rounded-xl border border-secondary/30 focus:border-secondary outline-none transition-all text-sm font-bold"
                        />
                        <button 
                          onClick={() => {
                            const baseFinalTotal = total + shippingCost;
                            const maxApplicable = Math.floor((baseFinalTotal / (loyaltyConfig.rewardAmount || 1)) * loyaltyConfig.pointsToRedeem);
                            setRedeemPoints(Math.min(loyaltyAccount.points, maxApplicable));
                          }}
                          className="px-3 py-2 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-xl text-xs font-bold transition-colors"
                        >
                          Máx
                        </button>
                      </div>
                      {redeemPoints > 0 && (
                        <div className="flex justify-between text-secondary mt-3">
                          <span>Descuento aplicado</span>
                          <span className="font-bold">-{currencySymbol}{discountConverted.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/20">
                      <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        {user ? (
                          <>Aún no eres miembro del club. <Link to="/mi-cuenta" className="text-secondary font-bold hover:underline">¡Únete ahora para canjear puntos!</Link></>
                        ) : (
                          <><Link to="/mi-cuenta" className="text-secondary font-bold hover:underline">Inicia sesión o regístrate</Link> para empezar a acumular puntos.</>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="pt-6 border-t border-outline-variant/30 flex justify-between items-center">
                  <span className="font-black text-xl">Total</span>
                  <div className="text-right">
                    <span className="font-black text-3xl text-primary">{currencySymbol}{finalTotal.toFixed(2)}</span>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">IVA Incluido</p>
                  </div>
                </div>
                
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4">Método de Pago</h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'card', label: 'Tarjeta de Crédito', icon: 'credit_card' },
                  { id: 'paypal', label: 'PayPal', icon: 'payments' },
                  { id: 'bizum', label: 'Bizum', icon: 'smartphone' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      paymentMethod === method.id 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-outline-variant/30 hover:border-outline-variant'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      paymentMethod === method.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined">{method.icon}</span>
                    </div>
                    <span className={`font-bold ${paymentMethod === method.id ? 'text-primary' : 'text-on-surface'}`}>
                      {method.label}
                    </span>
                    {paymentMethod === method.id && (
                      <span className="material-symbols-outlined ml-auto text-primary">check_circle</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Save Card Option */}
              {paymentMethod === 'card' && (
                <div className="mt-4 animate-fade-in">
                  <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-surface-container rounded-xl transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox"
                        checked={saveCardInfo}
                        onChange={(e) => setSaveCardInfo(e.target.checked)}
                        className="peer hidden"
                      />
                      <div className="w-5 h-5 border-2 border-outline-variant rounded-md peer-checked:bg-primary peer-checked:border-primary transition-all"></div>
                      <span className="material-symbols-outlined absolute text-on-primary text-base opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                    </div>
                    <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface">Guardar datos de tarjeta para futuras compras</span>
                  </label>
                </div>
              )}
            </div>

            {/* Checkout Options */}
            <div className="space-y-4">
              <div className="flex bg-surface-container rounded-2xl p-1">
                <button 
                  onClick={() => setIsGuest(true)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isGuest ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Invitado
                </button>
                <button 
                  onClick={() => setIsGuest(false)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isGuest ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Con mi cuenta
                </button>
              </div>

              {!isGuest && !user && (
                <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">info</span>
                  <div className="text-xs text-on-surface-variant leading-relaxed">
                    <p className="font-bold text-primary mb-1">¿Tienes cuenta?</p>
                    Inicia sesión para autocompletar tus datos de envío. 
                    <button 
                      onClick={() => window.location.href = '/admin'}
                      className="ml-1 text-primary font-bold hover:underline"
                    >
                      Ir al login
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Legal Acceptance */}
            <div className="flex items-start gap-3 p-4 bg-surface-container rounded-2xl border border-outline-variant/30">
              <div className="relative flex items-center mt-1">
                <input 
                  id="checkout-terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="peer hidden"
                />
                <div className="w-5 h-5 border-2 border-outline-variant rounded-md peer-checked:bg-primary peer-checked:border-primary transition-all cursor-pointer"></div>
                <span className="material-symbols-outlined absolute text-on-primary text-base opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">check</span>
              </div>
              <label htmlFor="checkout-terms" className="text-xs font-medium text-on-surface-variant cursor-pointer select-none">
                He leído y acepto los <Link to="/terminos-condiciones" className="text-primary font-bold hover:underline">Términos y Condiciones</Link>, la <Link to="/politica-privacidad" className="text-primary font-bold hover:underline">Política de Privacidad</Link> y la <Link to="/politica-devolucion" className="text-primary font-bold hover:underline">Política de Devolución</Link>.
              </label>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={items.length === 0 || isProcessing || currentStep !== 3 || !shippingDetails.fullName || !shippingDetails.address || !shippingDetails.city || !shippingDetails.zipCode || !shippingDetails.phone || !termsAccepted}
              className="w-full py-5 bg-primary text-on-primary rounded-2xl font-black text-lg hover:shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                <>
                  {currentStep === 3 ? 'Completar Pedido' : 'Finaliza los pasos anteriores'}
                  <span className="material-symbols-outlined">rocket_launch</span>
                </>
              )}
            </button>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                <span className="material-symbols-outlined text-xs">verified_user</span>
                Pago 100% Seguro
              </div>
              <div className="flex items-center gap-5 opacity-40 group transition-all duration-500 hover:opacity-100">
                <svg className="h-2.5 w-auto grayscale group-hover:grayscale-0 transition-all duration-500" viewBox="0 0 50 15.9" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.1 0.3l-2.4 15.3h3.8L22.9 0.3h-3.8zM34.9 0.5c-0.9-0.4-2.3-0.8-4-0.8-4.4 0-7.5 2.3-7.5 5.7 0 2.5 2.2 3.8 3.9 4.7 1.8 0.9 2.4 1.4 2.4 2.2 0 1.2-1.4 1.8-2.7 1.8-1.8 0-2.8-0.3-4.3-1l-0.6-0.3-0.6 4c1.1 0.5 3.1 1 5.2 1 4.7 0 7.7-2.3 7.8-5.9 0-2-1.2-3.5-3.8-4.7-0.7-0.3-1.5-0.8-1.5-1.6 0-0.8 0.9-1.6 2.8-1.6 1.6-0.1 2.7 0.3 3.6 0.7l0.4 0.2 0.7-4.1-4.9 0zM49.8 0.3l-3 15.3h-3.6c-0.8 0-1.5-0.5-1.8-1.2l-6.3-14.1h4l0.8 4.3h4.9l0.5-4.3h3.5zM45.8 11.4l-0.6-5.1-3.3 5.1h3.9zM12 0.3L8.3 10.6 7.9 8.4c-0.6-2.2-2.3-4.6-4.4-6L7 15.6h4L17.1 0.3h-5.1z" fill="#1A1876"/>
                  <path d="M6.3 0.3H0l0.1 0.6c4.9 1.3 8.2 4.3 9.5 7.9l-1.4-6.8C8 0.8 7.3 0.3 6.3 0.3z" fill="#F7B600"/>
                </svg>
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-500" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
