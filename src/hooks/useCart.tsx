import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data } = await api.get(`/stock/${productId}`);
      const currentDataCart = [...cart];
      const qtdStockProduct = data.amount;
      //verificar se ele já está no card,
      const productInCart = currentDataCart.filter(
        (cart) => cart.id === productId
      );

      if (productInCart.length > 0) {
        //já tem produto adicionado ao card
        for (const product of currentDataCart) {
          if (product.id === productId && qtdStockProduct > product.amount) {
            product.amount = product.amount + 1;
          } else if (
            product.id === productId &&
            qtdStockProduct === product.amount
          ) {
            toast.error("Quantidade solicitada fora de estoque");
            return;
          }
        }
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(currentDataCart)
        );
        setCart([...currentDataCart]);
      } else {
        const productToAdd = await api.get(`/products/${productId}`);
        let { data } = productToAdd;
        data = { ...data, amount: 1 };
        currentDataCart.push(data);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(currentDataCart)
        );
        setCart([...currentDataCart]);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const itemsWithoutCart = [...cart];
      const indexItemCart = itemsWithoutCart.findIndex(
        (product) => product.id === productId
      );
      if (indexItemCart !== -1) {
        itemsWithoutCart.splice(indexItemCart, 1);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(itemsWithoutCart)
        );
        setCart([...itemsWithoutCart]);
      } else {
        //lançar o error para cair no catch
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      } else {
        const { data } = await api.get(`/stock/${productId}`);
        const qtdStockProduct = data.amount;
        const currentDataCart = [...cart];
        if (qtdStockProduct >= amount) {
          for (const product of currentDataCart) {
            if (product.id === productId) {
              product.amount = amount;
            }
          }
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(currentDataCart)
          );
          setCart([...currentDataCart]);
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
