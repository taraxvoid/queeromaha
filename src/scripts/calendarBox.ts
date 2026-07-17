function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function initFocusOnOpen(
    details: HTMLDetailsElement,
    firstOption: HTMLAnchorElement,
) {
    details.addEventListener('toggle', () => {
        if (!details.open) return
        details.scrollIntoView({
            block: 'nearest',
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
        firstOption.focus()
    })
}

function initCalendarTracking(details: HTMLDetailsElement) {
    details
        .querySelectorAll<HTMLAnchorElement>('.calendar-option')
        .forEach((link) => {
            link.addEventListener('click', () => {
                const isGoogle = link.href.includes('google.com')
                window.posthog?.capture('calendar_subscribed', {
                    calendar_type: isGoogle ? 'google' : 'apple',
                })
            })
        })
}

function init() {
    const details = document.querySelector<HTMLDetailsElement>('#calendarBox')
    const firstOption =
        details?.querySelector<HTMLAnchorElement>('.calendar-option')
    if (!details || !firstOption) return

    initFocusOnOpen(details, firstOption)
    initCalendarTracking(details)
}

if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init)
else init()

export {}
