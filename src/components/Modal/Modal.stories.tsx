import type { Meta, StoryObj } from '@storybook/react-vite';

import { Modal } from './Modal';
import { docs } from './Modal.docs';
import validation from './Modal.validation.json';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { Input } from '../Input';
import { Select } from '../Select';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-01">
    <span className="font-manrope text-label text-text-primary">{label}</span>
    {children}
  </div>
);

/** The full sign-up composition from Figma's master: header, description,
 *  a form in the content slot, and two actions in the footer. */
export const Default: Story = {
  args: {
    id: 'signup',
    title: 'Sign Up for Event',
    description: 'Fill in your details below to reserve your spot.',
    onClose: () => {},
    children: (
      <>
        <Field label="Your name">
          <Input placeholder="Enter text..." />
        </Field>
        <Field label="Email address">
          <Input type="email" placeholder="you@example.com" />
        </Field>
        <Field label="Number of guests">
          <Select defaultValue="">
            <option value="" disabled>
              Select an option...
            </option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="4">4</option>
          </Select>
        </Field>
        <Checkbox label="Email me about future events" />
      </>
    ),
    footer: (
      <>
        <Button variant="secondary" icon={false}>
          Cancel
        </Button>
        <Button variant="accent">Reserve</Button>
      </>
    ),
  },
};

/** Without a footer — the content itself is the whole dialog. */
export const WithoutFooter: Story = {
  args: {
    id: 'confirm',
    title: 'You’re on the list',
    description: 'We’ve emailed you the details.',
    onClose: () => {},
    children: (
      <p className="font-manrope text-paragraph-small text-text-primary m-0">
        Check your inbox for the confirmation. If it hasn’t arrived in a few minutes, look in
        your spam folder.
      </p>
    ),
  },
};

/** No dismiss control, for a dialog whose only way out is an explicit
 *  decision in the footer. */
export const WithoutCloseButton: Story = {
  args: {
    id: 'decide',
    title: 'Cancel your booking?',
    description: 'This releases your place to the waiting list.',
    children: (
      <p className="font-manrope text-paragraph-small text-text-primary m-0">
        You can book again later, but the event may be full by then.
      </p>
    ),
    footer: (
      <>
        <Button variant="secondary" icon={false}>
          Keep it
        </Button>
        <Button variant="accent">Cancel booking</Button>
      </>
    ),
  },
};
