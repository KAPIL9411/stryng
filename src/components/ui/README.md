# Shared UI Component Library

A collection of reusable UI components for the Stryng Clothing e-commerce platform. All components follow the design system tokens defined in `src/styles/variables.css`.

## Components

### Button
Versatile button component with multiple variants and states.

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `loading`: boolean (default: false)
- `disabled`: boolean (default: false)
- `fullWidth`: boolean (default: false)
- `onClick`: Function
- `type`: 'button' | 'submit' | 'reset' (default: 'button')

**Example:**
```jsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

<Button variant="outline" loading>
  Loading...
</Button>
```

### Input
Input field component with validation and error handling.

**Props:**
- `type`: string (default: 'text')
- `label`: string
- `placeholder`: string
- `error`: string
- `helperText`: string
- `required`: boolean (default: false)
- `disabled`: boolean (default: false)
- `value`: string
- `onChange`: Function
- `leftIcon`: ReactNode
- `rightIcon`: ReactNode

**Example:**
```jsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
  required
/>
```

### Card
Container component for grouping content.

**Props:**
- `title`: string
- `children`: ReactNode
- `footer`: ReactNode
- `hoverable`: boolean (default: false)
- `bordered`: boolean (default: true)
- `onClick`: Function

**Example:**
```jsx
import { Card } from '@/components/ui';

<Card
  title="Product Details"
  hoverable
  footer={<Button>Add to Cart</Button>}
>
  <p>Product description...</p>
</Card>
```

### Modal
Modal dialog component with overlay.

**Props:**
- `isOpen`: boolean
- `onClose`: Function
- `title`: string
- `children`: ReactNode
- `footer`: ReactNode
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `closeOnOverlayClick`: boolean (default: true)
- `closeOnEscape`: boolean (default: true)

**Example:**
```jsx
import { Modal, Button } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={
    <>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

### Dropdown
Select dropdown component.

**Props:**
- `options`: Array<{value: string|number, label: string}>
- `value`: string | number
- `onChange`: Function
- `placeholder`: string (default: 'Select an option')
- `label`: string
- `disabled`: boolean (default: false)
- `error`: string

**Example:**
```jsx
import { Dropdown } from '@/components/ui';

<Dropdown
  label="Category"
  options={[
    { value: 'shirts', label: 'Shirts' },
    { value: 'pants', label: 'Pants' },
    { value: 'shoes', label: 'Shoes' }
  ]}
  value={selectedCategory}
  onChange={setSelectedCategory}
/>
```

### Badge
Small label component for status indicators.

**Props:**
- `variant`: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' (default: 'default')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `children`: ReactNode
- `dot`: boolean (default: false)

**Example:**
```jsx
import { Badge } from '@/components/ui';

<Badge variant="success">In Stock</Badge>
<Badge variant="error" size="sm">Out of Stock</Badge>
<Badge variant="primary" dot />
```

### Alert
Alert component for notifications and messages.

**Props:**
- `variant`: 'success' | 'warning' | 'error' | 'info' (default: 'info')
- `title`: string
- `children`: ReactNode
- `dismissible`: boolean (default: false)
- `onClose`: Function

**Example:**
```jsx
import { Alert } from '@/components/ui';

<Alert variant="success" title="Success!">
  Your order has been placed successfully.
</Alert>

<Alert variant="error" dismissible onClose={handleClose}>
  An error occurred. Please try again.
</Alert>
```

### Spinner
Loading spinner component.

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `color`: 'primary' | 'secondary' | 'accent' | 'white' (default: 'primary')
- `fullScreen`: boolean (default: false)
- `label`: string (default: 'Loading...')

**Example:**
```jsx
import { Spinner } from '@/components/ui';

<Spinner size="lg" />
<Spinner fullScreen />
```

## Design Tokens

All components use CSS variables defined in `src/styles/variables.css`:

- **Colors**: Primary, secondary, accent, semantic colors (success, warning, error, info)
- **Typography**: Font families, sizes, weights
- **Spacing**: Consistent spacing scale (space-1 to space-24)
- **Borders**: Border radius values (radius-sm to radius-full)
- **Shadows**: Box shadow utilities
- **Transitions**: Animation timing functions
- **Z-Index**: Layering system

## Accessibility

All components follow accessibility best practices:
- Semantic HTML elements
- ARIA attributes where needed
- Keyboard navigation support
- Focus visible states
- Screen reader labels

## Testing

Each component has comprehensive unit tests covering:
- Rendering with different props
- User interactions
- Edge cases
- Accessibility attributes

Run tests with:
```bash
npm test src/components/ui
```
