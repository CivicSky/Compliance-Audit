import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function RowActionMenu({
    onEdit,
    onDelete,
    items,
    editLabel = 'Edit',
    deleteLabel = 'Delete',
    disabled = false,
    buttonClassName = ''
}) {
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [anchorRect, setAnchorRect] = useState(null);

    const menuItems = Array.isArray(items) && items.length > 0
        ? items
        : [
            typeof onEdit === 'function' ? {
                label: editLabel,
                onClick: onEdit,
                disabled: disabled,
                tone: 'indigo',
                icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                )
            } : null,
            typeof onDelete === 'function' ? {
                label: deleteLabel,
                onClick: onDelete,
                disabled: disabled,
                tone: 'red',
                icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                )
            } : null,
        ].filter(Boolean);

    const position = useMemo(() => {
        if (!anchorRect) return null;
        const menuWidth = 220;
        const menuHeight = Math.max(44, (menuItems.length * 40) + 8);
        const padding = 8;

        const desiredLeft = anchorRect.right - menuWidth;
        const left = Math.min(
            Math.max(padding, desiredLeft),
            Math.max(padding, window.innerWidth - menuWidth - padding)
        );
        const desiredTop = anchorRect.bottom + 8;
        const top = Math.min(
            Math.max(padding, desiredTop),
            Math.max(padding, window.innerHeight - menuHeight - padding)
        );

        return { left, top };
    }, [anchorRect]);

    const close = () => setOpen(false);

    useEffect(() => {
        if (!open) return;

        const updateAnchor = () => {
            if (!buttonRef.current) return;
            setAnchorRect(buttonRef.current.getBoundingClientRect());
        };

        updateAnchor();

        const onPointerDown = (e) => {
            const target = e.target;
            if (buttonRef.current && buttonRef.current.contains(target)) return;
            if (menuRef.current && menuRef.current.contains(target)) return;
            close();
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') close();
        };

        const onScrollOrResize = () => close();

        window.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onScrollOrResize);
        window.addEventListener('scroll', onScrollOrResize, true);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onScrollOrResize);
            window.removeEventListener('scroll', onScrollOrResize, true);
        };
    }, [open]);

    const menu = open && position ? (
        <div
            ref={menuRef}
            role="menu"
            className="office-card-actions-menu fixed z-[200] w-[220px] overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg"
            style={{ left: position.left, top: position.top }}
            onClick={(e) => e.stopPropagation()}
        >
            {menuItems.map((item) => {
                const tone = item.tone || 'slate';
                const hoverClass = item.hoverClassName || (tone === 'red' ? 'hover:bg-red-50' : tone === 'emerald' ? 'hover:bg-emerald-50' : tone === 'indigo' ? 'hover:bg-indigo-50' : 'hover:bg-gray-50');
                const textClass = item.textClassName || (tone === 'red' ? 'text-red-600' : 'text-gray-700');
                const iconClass = item.iconClassName || (tone === 'red' ? 'text-red-600' : tone === 'emerald' ? 'text-emerald-600' : tone === 'indigo' ? 'text-indigo-600' : 'text-gray-600');

                return (
                    <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        onClick={() => {
                            close();
                            item.onClick?.();
                        }}
                        className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs transition ${textClass} ${hoverClass} disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap`}
                    >
                        {item.icon ? (
                            <svg className={`h-4 w-4 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                {item.icon}
                            </svg>
                        ) : null}
                        <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                );
            })}
        </div>
    ) : null;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (disabled) return;
                    setOpen((prev) => !prev);
                }}
                aria-label="Actions"
                title="Actions"
                className={buttonClassName || 'office-card-actions-button inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100'}
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                </svg>
            </button>
            {menu ? createPortal(menu, document.body) : null}
        </>
    );
}
