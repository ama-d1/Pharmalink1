import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
  category?: string;
  manufacturer?: string;
  dosage?: string;
  inStock?: boolean;
  // Added 2026-07-23 for the multi-pharmacy price-comparison rebuild — every
  // item in the cart now comes from a specific pharmacy's stock listing
  // (see pharmacyStockService.ts's PharmacyPriceComparisonRow), not a
  // generic global-price catalog entry.
  pharmacyId: string;
  pharmacyName: string;
};

// Result of trying to add an item from a DIFFERENT pharmacy than what's
// already in the cart — like a food delivery app, one order can only come
// from one pharmacy at a time. 'ok' means it was added (or the cart was
// empty/same-pharmacy); 'conflict' means the caller needs to ask the user
// whether to clear the cart first (addToCart does NOT clear automatically —
// silently wiping someone's cart is worse than asking).
export type AddToCartResult = 'ok' | 'conflict';

type CartContextType = {
  cart: Record<string, CartItem>;
  addToCart: (drug: any, pharmacyId: string, pharmacyName: string) => AddToCartResult;
  replaceCartWithItem: (drug: any, pharmacyId: string, pharmacyName: string) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemsCount: () => number;
  getCartItems: () => CartItem[];
  getCartPharmacy: () => { pharmacyId: string; pharmacyName: string } | null;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  // Load cart from AsyncStorage on app start
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever cart changes
  useEffect(() => {
    saveCart();
  }, [cart]);

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('@pharmalink_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('@pharmalink_cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const getCartPharmacy = () => {
    const items = Object.values(cart);
    if (items.length === 0) return null;
    return { pharmacyId: items[0].pharmacyId, pharmacyName: items[0].pharmacyName };
  };

  const buildItem = (drug: any, pharmacyId: string, pharmacyName: string, existingQuantity: number): CartItem => ({
    id: drug.id,
    name: drug.name,
    price: drug.price,
    description: drug.description,
    category: drug.category,
    manufacturer: drug.manufacturer,
    dosage: drug.dosage,
    inStock: drug.inStock ?? true,
    quantity: existingQuantity + 1,
    pharmacyId,
    pharmacyName,
  });

  const addToCart = (drug: any, pharmacyId: string, pharmacyName: string): AddToCartResult => {
    const existingPharmacy = getCartPharmacy();
    if (existingPharmacy && existingPharmacy.pharmacyId !== pharmacyId) {
      return 'conflict';
    }
    setCart((prev) => ({
      ...prev,
      [drug.id]: buildItem(drug, pharmacyId, pharmacyName, prev[drug.id]?.quantity || 0),
    }));
    return 'ok';
  };

  // Used when the user confirms "clear cart and add this instead" after an
  // addToCart 'conflict' — replaces the whole cart with just this one item
  // rather than merging across pharmacies.
  const replaceCartWithItem = (drug: any, pharmacyId: string, pharmacyName: string) => {
    setCart({ [drug.id]: buildItem(drug, pharmacyId, pharmacyName, 0) });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          quantity
        }
      }));
    }
  };

  const clearCart = () => {
    setCart({});
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  };

  const getCartItems = () => {
    return Object.values(cart);
  };

  const value = {
    cart,
    addToCart,
    replaceCartWithItem,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemsCount,
    getCartItems,
    getCartPharmacy,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
