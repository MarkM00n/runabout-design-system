import type { Meta, StoryObj } from '@storybook/react-vite';

import { SignupForm } from './SignupForm';
import { docs } from './SignupForm.docs';
import validation from './SignupForm.validation.json';

// Source: Figma Sign-up form (1490:546), State = Default / Submitting /
// Success / Error. One story per state, pinned with `initialState` so
// Chromatic snapshots each one; opening in a state never moves focus.
//
// The form has no background and sets no mode, so every story pins the
// canvas to On Brand — the hero surface it was designed for — through the
// toolbar's own Mode global. AcrossSurfaces shows it on all six at once.
//
// Default is live: submit an address to walk through Submitting and Success
// against an 800ms mock, or "fail@example.com" to see the failed-submit
// Error. An address without a dot in its domain shows the validation Error.

const MOCK_DELAY_MS = 800;
// globalThis.Error: this module exports a story named Error, which shadows it.
const mockSubmit = (email: string) =>
  new Promise<void>((resolve, reject) =>
    setTimeout(() => (email.startsWith('fail@') ? reject(new globalThis.Error('Mock failure')) : resolve()), MOCK_DELAY_MS),
  );

const meta = {
  title: 'Components/SignupForm',
  component: SignupForm,
  parameters: {
    layout: 'padded',
    designSystem: docs,
    designSystemValidation: validation,
  },
  globals: { mode: 'brand' },
  tags: ['autodocs'],
  args: { onSubmit: mockSubmit },
  argTypes: {
    initialState: { control: 'select', options: ['default', 'submitting', 'success', 'error'] },
    initialError: { control: 'select', options: ['invalid', 'failed'] },
    onSubmit: { control: false },
  },
  decorators: [
    // The column width the landing page's hero gives it at desktop.
    (Story) => (
      <div className="mx-auto w-full max-w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignupForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** State=Default — live, against the mock above. */
export const Default: Story = {};

/** State=Submitting — button disabled, label "Joining…", field read-only. */
export const Submitting: Story = { args: { initialState: 'submitting' } };

/** The form's only disabled appearance is Submitting's button: there is no
 *  separate disabled prop. Same render as Submitting, kept so the disabled
 *  treatment has a story of its own. */
export const Disabled: Story = { args: { initialState: 'submitting' } };

/** State=Success — the form replaced in place by the confirmation. */
export const Success: Story = { args: { initialState: 'success' } };

/** State=Error — validation failure, Figma's copy. */
export const Error: Story = { args: { initialState: 'error', initialError: 'invalid' } };

/** The same Error state after onSubmit rejected (network, 4xx or 5xx), with
 *  the retry copy. The field isn't flagged invalid. */
export const ErrorSubmitFailed: Story = {
  name: 'Error · submit failed',
  args: { initialState: 'error', initialError: 'failed' },
};

/** Lead-in as rich content — how the Vines & Vinyl page colours its
 *  "early bird ticket" phrase. */
export const CustomLeadIn: Story = {
  args: {
    leadIn: (
      <>
        Join the list and be first to grab an <span className="text-text-accent">early bird ticket</span> — strictly limited.
      </>
    ),
  },
};

const MODES = ['light', 'ink', 'dark', 'brand', 'accent', 'soft'] as const;

/** Error on all six surfaces. Each tile is a surface, so it owns its mode;
 *  the form inside sets none. The toolbar's Brand control still applies. */
export const AcrossSurfaces: Story = {
  args: { initialState: 'error' },
  render: (args) => (
    <div className="flex flex-col gap-02">
      {MODES.map((mode) => (
        <div key={mode} data-mode={mode} className="flex flex-col gap-02 rounded-2xl bg-surface-section p-04">
          <span className="font-manrope text-caption text-text-secondary">{mode}</span>
          <SignupForm {...args} />
        </div>
      ))}
    </div>
  ),
};
