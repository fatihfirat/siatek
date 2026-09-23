import type {CartItem,Product} from '../types';
export function addShoppingItems(cart:CartItem[], items:{product:Product;quantity:number}[]):CartItem[]{
 const result=cart.map(i=>({...i}));
 for(const {product,quantity} of items){
  if(!Number.isFinite(quantity)||!Number.isFinite(product.stock))continue;
  const min=Math.max(1,product.minOrderQuantity||1);
  const existing=result.find(i=>i.product.id===product.id);
  const available=Math.max(0,product.stock-(existing?.quantity||0));
  const amount=Math.min(Math.max(min,quantity),available);
  if(amount<min)continue;
  if(existing){existing.quantity+=amount;existing.product=product;}
  else result.push({product,quantity:amount});
 }
 return result;
}
export function setShoppingQuantity(cart:CartItem[],id:string,quantity:number):CartItem[]{
 if(!Number.isFinite(quantity))return cart;
 if(quantity<=0)return cart.filter(i=>i.product.id!==id);
 return cart.map(i=>i.product.id===id?{...i,quantity:Math.min(i.product.stock,Math.max(i.product.minOrderQuantity||1,quantity))}:i).filter(i=>i.quantity>0);
}
