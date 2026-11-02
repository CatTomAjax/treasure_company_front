'use client';

// Base UI primitives with shadcn/ui composition; upstream MIT notices are in
// docs/licenses/app-controls.txt. Keep native form values and events intact.
import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppOption = {
  value: string;
  label: string;
  disabled: boolean;
  hidden: boolean;
  group: string;
};
function textContent(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number')
        return String(child);
      return React.isValidElement<{ children?: React.ReactNode }>(child)
        ? textContent(child.props.children)
        : '';
    })
    .join('');
}
export function collectSelectOptions(
  children: React.ReactNode,
  group = '',
  groupDisabled = false,
): AppOption[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (
      !React.isValidElement<
        React.OptionHTMLAttributes<HTMLOptionElement> & {
          children?: React.ReactNode;
        }
      >(child)
    )
      return [];
    if (child.type === 'option') {
      const text = textContent(child.props.children);
      return [
        {
          value: String(child.props.value ?? text),
          label: child.props.label ?? text,
          disabled: groupDisabled || !!child.props.disabled,
          hidden: !!child.props.hidden,
          group,
        },
      ];
    }
    if (child.type === 'optgroup')
      return collectSelectOptions(
        child.props.children,
        child.props.label || '',
        groupDisabled || !!child.props.disabled,
      );
    if (child.type === React.Fragment)
      return collectSelectOptions(child.props.children, group, groupDisabled);
    return [];
  });
}

type AppSelectProps = React.ComponentPropsWithRef<'select'>;
export const AppSelect = React.forwardRef<HTMLSelectElement, AppSelectProps>(
  function AppSelect(
    {
      children,
      className,
      style,
      value,
      defaultValue,
      onChange,
      onInvalid,
      onFocus,
      onBlur,
      disabled,
      required,
      multiple,
      size,
      id,
      title,
      ...nativeProps
    },
    forwardedRef,
  ) {
    const native = React.useRef<HTMLSelectElement>(null);
    const trigger = React.useRef<HTMLButtonElement>(null);
    const [open, setOpen] = React.useState(false);
    const [invalid, setInvalid] = React.useState(false);
    const options = collectSelectOptions(children);
    const optionSignature = JSON.stringify(options);
    const first = options.find((option) => !option.disabled)?.value ?? '';
    const [local, setLocal] = React.useState<string | string[]>(() =>
      multiple
        ? Array.isArray(defaultValue)
          ? defaultValue.map(String)
          : []
        : String(defaultValue ?? first),
    );
    React.useImperativeHandle(forwardedRef, () => native.current!, []);
    const selected =
      value === undefined
        ? local
        : multiple
          ? Array.isArray(value)
            ? value.map(String)
            : [String(value)]
          : String(value);
    const label = Array.isArray(selected)
      ? options
          .filter((option) => selected.includes(option.value))
          .map((option) => option.label)
          .join('、')
      : options.find((option) => option.value === selected)?.label;
    const accessible = Object.fromEntries(
      Object.entries(nativeProps).filter(
        ([key]) => key.startsWith('aria-') || key.startsWith('data-'),
      ),
    );
    React.useEffect(() => {
      const select = native.current,
        form = select?.form;
      if (!form) return;
      const reset = () =>
        queueMicrotask(() => {
          if (select)
            setLocal(
              multiple
                ? [...select.selectedOptions].map((option) => option.value)
                : select.value,
            );
          setInvalid(false);
        });
      form.addEventListener('reset', reset);
      return () => form.removeEventListener('reset', reset);
    }, [multiple]);
    function commit(next: string | string[] | null) {
      const select = native.current;
      if (!select) return;
      if (Array.isArray(next))
        for (const option of select.options)
          option.selected = next.includes(option.value);
      else
        Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value',
        )!.set!.call(select, next ?? '');
      // A real change event preserves existing handlers, target/currentTarget,
      // form capture listeners and React's controlled-select reconciliation.
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const groups = [
      ...new Set(
        options
          .filter((option) => !option.hidden)
          .map((option) => option.group),
      ),
    ];
    React.useEffect(() => {
      if (value === undefined && native.current)
        setLocal(
          multiple
            ? [...native.current.selectedOptions].map((option) => option.value)
            : native.current.value,
        );
    }, [optionSignature, multiple, value]);
    return (
      <span
        className="app-select-field"
        data-ui-select-wrapper
        data-required={required || undefined}
      >
        <SelectPrimitive.Root<string, boolean>
          value={selected}
          multiple={!!multiple}
          disabled={disabled}
          open={open}
          onOpenChange={setOpen}
          onValueChange={commit}
          items={options.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        >
          <SelectPrimitive.Trigger
            ref={trigger}
            id={id}
            {...accessible}
            data-ui-select-trigger
            data-slot="select-trigger"
            className={cn('app-select-trigger', className)}
            style={style}
            title={title || label}
            aria-required={required || undefined}
            aria-invalid={invalid || nativeProps['aria-invalid']}
            onFocus={(event) => {
              if (native.current)
                onFocus?.({
                  ...event,
                  target: native.current,
                  currentTarget: native.current,
                } as React.FocusEvent<HTMLSelectElement>);
            }}
            onBlur={(event) => {
              if (native.current)
                onBlur?.({
                  ...event,
                  target: native.current,
                  currentTarget: native.current,
                } as React.FocusEvent<HTMLSelectElement>);
            }}
          >
            <span className="app-select-value">{label || '请选择…'}</span>
            <SelectPrimitive.Icon className="app-select-icon">
              <ChevronDown size={15} />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Positioner
              className="app-select-positioner"
              side="bottom"
              align="start"
              sideOffset={7}
              collisionPadding={12}
              alignItemWithTrigger={false}
            >
              <SelectPrimitive.Popup
                className="app-select-popup"
                data-slot="select-content"
              >
                <SelectPrimitive.ScrollUpArrow className="app-select-scroll">
                  <ChevronUp size={14} />
                </SelectPrimitive.ScrollUpArrow>
                <SelectPrimitive.List className="app-select-list">
                  {groups.map((group) => (
                    <SelectPrimitive.Group key={group}>
                      {group && (
                        <SelectPrimitive.GroupLabel className="app-select-group-label">
                          {group}
                        </SelectPrimitive.GroupLabel>
                      )}
                      {options
                        .filter(
                          (option) => option.group === group && !option.hidden,
                        )
                        .map((option, index) => (
                          <SelectPrimitive.Item
                            key={`${option.value}:${index}`}
                            value={option.value}
                            disabled={option.disabled}
                            className="app-select-item"
                            data-slot="select-item"
                            label={option.label}
                          >
                            <SelectPrimitive.ItemText className="app-select-item-text">
                              {option.label || '（未选择）'}
                            </SelectPrimitive.ItemText>
                            <SelectPrimitive.ItemIndicator className="app-select-check">
                              <Check size={15} />
                            </SelectPrimitive.ItemIndicator>
                          </SelectPrimitive.Item>
                        ))}
                    </SelectPrimitive.Group>
                  ))}
                </SelectPrimitive.List>
                {!options.filter((option) => !option.hidden).length && (
                  <p className="app-select-empty">暂无可选项</p>
                )}
                <SelectPrimitive.ScrollDownArrow className="app-select-scroll">
                  <ChevronDown size={14} />
                </SelectPrimitive.ScrollDownArrow>
              </SelectPrimitive.Popup>
            </SelectPrimitive.Positioner>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        <select
          {...nativeProps}
          ref={native}
          id={id ? `${id}-native` : undefined}
          disabled={disabled}
          required={required}
          multiple={multiple}
          size={size}
          value={value}
          defaultValue={defaultValue}
          tabIndex={-1}
          aria-hidden="true"
          className="app-select-native"
          data-ui-select-native
          onChange={(event) => {
            setLocal(
              multiple
                ? [...event.currentTarget.selectedOptions].map(
                    (option) => option.value,
                  )
                : event.currentTarget.value,
            );
            setInvalid(false);
            onChange?.(event);
          }}
          onInvalid={(event) => {
            onInvalid?.(event);
            event.preventDefault();
            setInvalid(true);
            trigger.current?.focus();
            setOpen(true);
          }}
        >
          {children}
        </select>
      </span>
    );
  },
);

export const AppButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'>
>(function AppButton({ className, type, ...props }, ref) {
  const appearance =
    /(?:^|\s)(?:primary|primary-button|ep-primary|btn-primary)(?:\s|$)/.test(
      className || '',
    )
      ? 'primary'
      : /(?:^|\s)(?:danger|destructive|delete-button)(?:\s|$)/.test(
            className || '',
          )
        ? 'danger'
        : 'default';
  // Native buttons submit by default; preserve that contract in legacy forms.
  return (
    <ButtonPrimitive
      ref={ref}
      type={type || 'submit'}
      data-ui-button
      data-ui-appearance={appearance}
      className={cn('app-button', className)}
      {...props}
    />
  );
});
