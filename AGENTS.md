# Project Architecture & Coding Standards

## 1. Expo & Framework Version
Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

## 2. Modal & Bottom Sheet Architecture (STRICT)

### The Problem (Anti-Pattern - NEVER DO THIS)
Do **NOT** use `<Modal animationType="slide">` in conjunction with custom `PanResponder` or `Animated.Value` `translateY` gestures.
* **Why it fails**: When `visible` becomes `false`, React Native's native `<Modal>` fires its own exit slide transition. If JavaScript simultaneously animates `translateY` or resets it to `0`, the modal will flash back onto the screen at `y=0` and slide down a second time, creating the notorious **"double close / reopen glitch"**.

### The Standard Pattern (ALWAYS DO THIS)
Whenever you create or edit any bottom sheet or modal across the entire app:

1. **Prefer the Standardized Component**:
   Always use `SwipeableModal` from `src/components/SwipeableModal`:
   ```tsx
   import SwipeableModal from '../components/SwipeableModal';

   <SwipeableModal
     visible={isModalOpen}
     onClose={() => setIsModalOpen(false)}
     title="Modal Title"
     subtitle="Optional explanatory text"
   >
     {/* Modal Content / Cards / Lists */}
   </SwipeableModal>
   ```

2. **If Building a Custom Sheet**:
   * Set `<Modal animationType="none" transparent={true}>`.
   * Use a single, unified `Animated.Value` for both `translateY` (starts at `600`, springs to `0`) and `backdropOpacity` (fades `0` to `1`).
   * When closing (via backdrop tap, close button, or swipe-down gesture), animate `translateY` to `600` over ~200ms and ONLY call `setVisible(false)` inside the `.start()` completion callback.
   * On gesture `onPanResponderRelease`, if `dy > 70` or `vy > 0.4`, run the closing animation. If under threshold, use `Animated.spring` to snap back to `0`.
   * Include the top drag indicator dash (`width: 44`, `height: 5`, `borderRadius: 3`) with generous touch padding.

---

## 3. Icons & Emoji Restrictions (Compulsory)
1. **Strict Prohibition on Unrequested Emojis**: NEVER include emojis as icons or text unless explicitly requested.
2. **Mandatory Industry-Standard Icons**: ALWAYS use `lucide-react-native` or standard SVG icons.
