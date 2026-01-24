Below is **exactly what the APP developer must do for cart functionality**, **no code**, no backend talk beyond what is strictly needed.

---

# 📦 Cart Functionality — App Developer Instructions (ONLY)

## 1️⃣ Cart Ownership & Scope

* Cart exists **only inside the mobile app**
* Cart is **per user + per selected cafe**
* Only **one cart at a time**
* Changing cafe **clears the cart**

---

## 2️⃣ Cart Data Structure (Conceptual)

The cart must store:

* Selected `cafeId`
* Active `menuId`
* List of items:

  * itemId
  * itemName (snapshot)
  * price (snapshot)
  * quantity
  * itemType (short / long)
* Applied tax
* Calculated subtotal
* Calculated total

⚠️ All values are **snapshots at time of add**

---

## 3️⃣ When to Create the Cart

* Create cart when:

  * User adds **first item**
* Cart must NOT exist before that

---

## 4️⃣ Adding Items to Cart

When user taps “Add to Cart”:

1. Check if cart exists

   * If not → create cart
2. Check if cart cafe matches selected cafe

   * If not → clear cart and create new
3. If item already exists:

   * Increase quantity
4. If new item:

   * Add as new entry
5. Recalculate totals instantly
6. Update cart UI immediately

---

## 5️⃣ Removing Items from Cart

* User can:

  * Decrease quantity
  * Remove item completely
* If cart becomes empty:

  * Cart must be destroyed

---

## 6️⃣ Cart Persistence (CRITICAL)

* Cart must be saved locally
* Cart must survive:

  * App restart
  * App backgrounding
* Restore cart on app launch

---

## 7️⃣ Cart UI Behavior

Cart UI must show:

* Item list
* Quantity controls
* Subtotal
* Tax
* Total
* “Place Order” button

Cart UI must update:

* Instantly on every change
* Without backend calls

---

## 8️⃣ When NOT to Modify Cart

Cart must NOT change when:

* Menu updates in backend
* Item price changes in backend
* Item becomes unavailable

These are handled **only at order placement**

---

## 9️⃣ Cart Validation Trigger

Cart is only validated when:

* User presses **Place Order**

Before that:

* Cart is purely local

---

## 🔟 Clearing the Cart

Cart must be cleared when:

* Order is successfully placed
* User manually clears cart
* User switches cafe
* User logs out

---

## 1️⃣1️⃣ Offline Behavior

* Cart must work fully offline
* User can add/remove items offline
* Order placement requires connectivity

---

## 1️⃣2️⃣ Error Handling Rules

If order placement fails:

* Cart must remain unchanged
* Show error to user
* Allow retry

---

## 1️⃣3️⃣ App Developer Must NOT Do

❌ Do NOT store cart in backend
❌ Do NOT sync cart with server
❌ Do NOT trust backend pricing before checkout
❌ Do NOT allow multiple cafe carts

---

## 1️⃣4️⃣ Final Golden Rule

> **Cart is temporary, local, fast, and disposable.
> It exists only to help the user place an order.**

