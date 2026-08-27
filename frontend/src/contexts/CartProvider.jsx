import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { commerceApi } from '../lib/commerce.js';
import { useAuth } from './auth.js';
import { CartContext } from './cart.js';

const emptyCart = { id: null, userId: null, items: [], itemCount: 0, subtotal: 0, total: 0, updatedAt: null };

function totalCart(cart) {
  const items = (cart?.items ?? []).map((item) => ({
    ...item,
    lineTotal: Number(item.product.price) * item.quantity,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    ...(cart ?? emptyCart),
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    total: subtotal,
  };
}

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['cart', user?.id ?? 'guest'];

  const cartQuery = useQuery({
    queryKey,
    queryFn: commerceApi.cart,
    enabled: isAuthenticated,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!isAuthenticated) queryClient.removeQueries({ queryKey: ['cart'] });
  }, [isAuthenticated, queryClient]);

  const updateMutation = useMutation({
    mutationFn: commerceApi.updateCart,
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (current = emptyCart) => totalCart({
        ...current,
        items: current.items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeMutation = useMutation({
    mutationFn: commerceApi.removeCart,
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (current = emptyCart) => totalCart({
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const addMutation = useMutation({
    mutationFn: commerceApi.addCart,
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  const checkoutMutation = useMutation({
    mutationFn: commerceApi.checkout,
    onSuccess: () => {
      queryClient.setQueryData(queryKey, emptyCart);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const value = useMemo(() => ({
    cart: cartQuery.data ?? emptyCart,
    cartQuery,
    itemCount: cartQuery.data?.itemCount ?? 0,
    addItem: addMutation.mutateAsync,
    addMutation,
    updateItem: updateMutation.mutateAsync,
    updateMutation,
    removeItem: removeMutation.mutateAsync,
    removeMutation,
    checkout: checkoutMutation.mutateAsync,
    checkoutMutation,
    refresh: cartQuery.refetch,
  }), [addMutation, cartQuery, checkoutMutation, removeMutation, updateMutation]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
