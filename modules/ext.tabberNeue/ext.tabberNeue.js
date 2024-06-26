/**
 * ext.tabberNeue
 *
 * NAMING THINGS ARE HARD :(
 * TODO: Make class and function names more accurate?
 * TODO: Split classes into different modules
 */
const config = require( './config.json' );
const Hash = require( './Hash.js' );
const Transclude = require( './Transclude.js' );
const Util = require( './Util.js' );

let resizeObserver;

/**
 * Class representing TabberAction functionality for handling tab events and animations.
 *
 * @class
 */
class TabberAction {
	/**
	 * Determines if animations should be shown based on the user's preference.
	 *
	 * @return {boolean} - Returns true if animations should be shown, false otherwise.
	 */
	static shouldShowAnimation() {
		return (
			!window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ||
			!config.enableAnimation
		);
	}

	/**
	 * Toggles the animation state based on the user's preference.
	 * If animations should be shown,
	 * adds the 'tabber-animations-ready' class to the document element.
	 *
	 * @param {boolean} enableAnimations - Flag indicating whether animations should be enabled.
	 */
	static toggleAnimation( enableAnimations ) {
		if ( !TabberAction.shouldShowAnimation() ) {
			return;
		}
		window.requestAnimationFrame( () => {
			document.documentElement.classList.toggle(
				'tabber-animations-ready',
				enableAnimations
			);
		} );
	}

	/**
	 * Updates the header overflow based on the scroll position of the tab list.
	 * If the tab list is scrollable, it adds/removes classes to show/hide navigation buttons.
	 *
	 * @param {Element} tabberEl - The tabber element containing the header and tab list.
	 */
	static updateHeaderOverflow( tabberEl ) {
		const header = tabberEl.querySelector( ':scope > .tabber__header' );
		const tablist = header.querySelector( ':scope > .tabber__tabs' );
		const { roundScrollLeft } = Util;
		const tablistWidth = tablist.offsetWidth;
		const tablistScrollWidth = tablist.scrollWidth;
		const isScrollable = tablistScrollWidth > tablistWidth;

		if ( !isScrollable ) {
			window.requestAnimationFrame( () => {
				header.classList.remove( 'tabber__header--next-visible' );
				header.classList.remove( 'tabber__header--prev-visible' );
			} );
			return;
		}

		const scrollLeft = roundScrollLeft( tablist.scrollLeft );
		const isAtStart = scrollLeft <= 0;
		const isAtEnd = scrollLeft + tablistWidth >= tablistScrollWidth;
		const isAtMiddle = !isAtStart && !isAtEnd;

		window.requestAnimationFrame( () => {
			header.classList.toggle(
				'tabber__header--next-visible',
				isAtStart || isAtMiddle
			);
			header.classList.toggle(
				'tabber__header--prev-visible',
				isAtEnd || isAtMiddle
			);
		} );
	}

	/**
	 * Animate and update the indicator position and width based on the active tab.
	 *
	 * @param {Element} indicator - The indicator element (optional, defaults to the first '.tabber__indicator' found in the parent).
	 * @param {Element} activeTab - The currently active tab.
	 * @param {Element} tablist - The parent element containing the tabs.
	 */
	static animateIndicator( indicator, activeTab, tablist ) {
		const tablistScrollLeft = Util.roundScrollLeft( tablist.scrollLeft );
		const width = Util.getElementSize( activeTab, 'width' );
		const transformValue = activeTab.offsetLeft - tablistScrollLeft;

		window.requestAnimationFrame( () => {
			indicator.classList.add( 'tabber__indicator--visible' );
			tablist.classList.add( 'tabber__tabs--animate' );
			indicator.style.width = width + 'px';
			indicator.style.transform = `translateX(${ transformValue }px)`;
			setTimeout( () => {
				indicator.classList.remove( 'tabber__indicator--visible' );
				tablist.classList.remove( 'tabber__tabs--animate' );
			}, 250 );
		} );
	}

	/**
	 * Sets the active tab panel in the tabber element.
	 * Loads the content of the active tab panel if it has a 'data-mw-tabber-load-url' attribute.
	 * Adjusts the height of the section containing the active tab panel based on its content height.
	 * Scrolls the section to make the active tab panel visible.
	 *
	 * @param {Element} activeTabpanel - The active tab panel element to be set.
	 */
	static setActiveTabpanel( activeTabpanel ) {
		const section = activeTabpanel.closest( '.tabber__section' );

		if ( activeTabpanel.dataset.mwTabberLoadUrl ) {
			const transclude = new Transclude( activeTabpanel );
			transclude.loadPage();
		}

		window.requestAnimationFrame( () => {
			const activeTabpanelHeight = Util.getElementSize(
				activeTabpanel,
				'height'
			);
			section.style.height = activeTabpanelHeight + 'px';
			// Scroll to tab
			section.scrollLeft = activeTabpanel.offsetLeft;
		} );
	}

	/**
	 * Sets the active tab in the tabber element.
	 * Updates the visibility and attributes of tab panels and tabs based on the active tab.
	 *
	 * @param {Element} activeTab - The active tab element to be set.
	 */
	static setActiveTab( activeTab ) {
		const activeTabpanel = document.getElementById( activeTab.getAttribute( 'aria-controls' ) );
		const tabberEl = activeTabpanel.closest( '.tabber' );
		const indicator = tabberEl.querySelector( ':scope > .tabber__header > .tabber__indicator' );
		const tabpanels = tabberEl.querySelectorAll(
			':scope > .tabber__section > .tabber__panel'
		);
		const tabs = tabberEl.querySelectorAll(
			':scope > .tabber__header > .tabber__tabs > .tabber__tab'
		);

		const tabStateUpdates = [];
		const tabpanelVisibilityUpdates = [];

		tabpanels.forEach( ( tabpanel ) => {
			if ( tabpanel === activeTabpanel ) {
				tabpanelVisibilityUpdates.push( {
					element: tabpanel,
					attributes: {
						'aria-hidden': 'false'
					}
				} );
				if ( typeof resizeObserver !== 'undefined' && resizeObserver ) {
					resizeObserver.observe( activeTabpanel );
				}
			} else {
				tabpanelVisibilityUpdates.push( {
					element: tabpanel,
					attributes: {
						'aria-hidden': 'true'
					}
				} );
				if ( typeof resizeObserver !== 'undefined' && resizeObserver ) {
					resizeObserver.unobserve( tabpanel );
				}
			}
		} );

		tabs.forEach( ( tab ) => {
			if ( tab === activeTab ) {
				tabStateUpdates.push( {
					element: tab,
					attributes: {
						'aria-selected': true,
						tabindex: '0'
					}
				} );
			} else {
				tabStateUpdates.push( {
					element: tab,
					attributes: {
						'aria-selected': false,
						tabindex: '-1'
					}
				} );
			}
		} );

		window.requestAnimationFrame( () => {
			tabpanelVisibilityUpdates.forEach( ( { element, attributes } ) => {
				Util.setAttributes( element, attributes );
			} );
			tabStateUpdates.forEach( ( { element, attributes } ) => {
				Util.setAttributes( element, attributes );
			} );
			TabberAction.animateIndicator( indicator, activeTab, activeTab.parentElement );
			TabberAction.setActiveTabpanel( activeTabpanel );
		} );
	}

	/**
	 * Scrolls the tab list by the specified offset.
	 *
	 * @param {number} offset - The amount to scroll the tab list by.
	 * @param {Element} tablist - The tab list element to scroll.
	 */
	static scrollTablist( offset, tablist ) {
		const scrollLeft = Util.roundScrollLeft( tablist.scrollLeft ) + offset;

		window.requestAnimationFrame( () => {
			tablist.scrollLeft = Math.min(
				Math.max( scrollLeft, 0 ),
				tablist.scrollWidth - tablist.offsetWidth
			);
		} );
	}

	/**
	 * Handles the click event on a header button element.
	 * Calculates the scroll offset based on the button type ('prev' or 'next').
	 * Scrolls the tab list by the calculated offset using the 'scrollTablist' method
	 * of the TabberAction class.
	 *
	 * @param {Element} button - The header button element that was clicked.
	 * @param {string} type - The type of button clicked ('prev' or 'next').
	 */
	static handleHeaderButton( button, type ) {
		const tablist = button
			.closest( '.tabber__header' )
			.querySelector( '.tabber__tabs' );
		const tablistWidth = tablist.offsetWidth;
		const scrollOffset = type === 'prev' ? -tablistWidth / 2 : tablistWidth / 2;
		TabberAction.scrollTablist( scrollOffset, tablist );
	}

	/**
	 * Checks if there are entries and the first entry has a target element
	 * that is an instance of Element.
	 * If true, calls the setActiveTabpanel method of the TabberAction class
	 * with the activeTabpanel as the argument.
	 *
	 * @param {ResizeObserverEntry[]} entries
	 */
	static handleElementResize( entries ) {
		if ( entries && entries.length > 0 ) {
			const activeTabpanel = entries[ 0 ].target;
			if ( activeTabpanel instanceof Element ) {
				TabberAction.setActiveTabpanel( activeTabpanel );
			}
		}
	}

	/**
	 * Sets up event listeners for tab elements.
	 * Attaches a click event listener to the body content element,
	 * delegating the click event to the tab elements.
	 * When a tab element is clicked, it triggers the handleClick method of the TabberAction class.
	 */
	static attachEvents() {
		if ( window.ResizeObserver ) {
			resizeObserver = new ResizeObserver( TabberAction.handleElementResize );
		}
	}
}

/**
 * Represents a TabberEvent class that handles events related to tab navigation.
 *
 * @class TabberEvent
 * @param {Element} tabber - The tabber element containing the tabs and header.
 * @param {Element} tablist - The tab list element containing the tab elements.
 */
class TabberEvent {
	constructor( tabber, tablist ) {
		this.tabber = tabber;
		this.tablist = tablist;
		this.header = this.tablist.parentElement;
		this.tabs = this.tablist.querySelectorAll( ':scope > .tabber__tab' );
		this.activeTab = this.tablist.querySelector( '[aria-selected="true"]' );
		this.indicator = this.tabber.querySelector( ':scope > .tabber__header > .tabber__indicator' );
		this.tabFocus = 0;
		this.debouncedUpdateHeaderOverflow = mw.util.debounce( () => TabberAction.updateHeaderOverflow( this.tabber ), 250 );
		this.handleTabFocusChange = this.handleTabFocusChange.bind( this );
		this.onHeaderClick = this.onHeaderClick.bind( this );
		this.onTablistScroll = this.onTablistScroll.bind( this );
		this.onTablistKeydown = this.onTablistKeydown.bind( this );
	}

	/**
	 * Returns a debounced function that updates the header overflow.
	 *
	 * @return {Function} A debounced function that updates the header overflow.
	 */
	debounceUpdateHeaderOverflow() {
		return this.debouncedUpdateHeaderOverflow;
	}

	/**
	 * Handles changing the focus to the next or previous tab based on the arrow direction.
	 *
	 * @param {string} arrowDirection - The direction of the arrow key pressed ('right' or 'left').
	 */
	handleTabFocusChange( arrowDirection ) {
		this.tabs[ this.tabFocus ].setAttribute( 'tabindex', '-1' );
		if ( arrowDirection === 'right' ) {
			this.tabFocus = ( this.tabFocus + 1 ) % this.tabs.length;
		} else if ( arrowDirection === 'left' ) {
			this.tabFocus = ( this.tabFocus - 1 + this.tabs.length ) % this.tabs.length;
		}

		this.tabs[ this.tabFocus ].setAttribute( 'tabindex', '0' );
		this.tabs[ this.tabFocus ].focus();
	}

	/**
	 * Handles the click event on the tabber header.
	 * If a tab is clicked, it sets the active tab, updates the URL hash without adding to browser history,
	 * and sets the active tab using TabberAction.setActiveTab method.
	 * If a previous or next button is clicked on a pointer device, it handles the header button accordingly.
	 *
	 * @param {Event} e - The click event object.
	 */
	onHeaderClick( e ) {
		const tab = e.target.closest( '.tabber__tab' );
		if ( tab ) {
			// Prevent default anchor actions
			e.preventDefault();
			this.activeTab = tab;

			// Update the URL hash without adding to browser history
			if ( config.updateLocationOnTabChange ) {
				history.replaceState(
					null,
					'',
					window.location.pathname + window.location.search + '#' + this.activeTab.id
				);
			}
			TabberAction.setActiveTab( this.activeTab );
			return;
		}

		const isPointerDevice = window.matchMedia( '(hover: hover)' ).matches;
		if ( isPointerDevice ) {
			const prevButton = e.target.closest( '.tabber__header__prev' );
			if ( prevButton ) {
				TabberAction.handleHeaderButton( prevButton, 'prev' );
				return;
			}

			const nextButton = e.target.closest( '.tabber__header__next' );
			if ( nextButton ) {
				TabberAction.handleHeaderButton( nextButton, 'next' );
				return;
			}
		}
	}

	/**
	 * Update the header overflow based on the scroll position of the tablist.
	 */
	onTablistScroll() {
		this.debouncedUpdateHeaderOverflow();
	}

	/**
	 * Handles the keydown event on the tablist element.
	 * If the key pressed is 'ArrowRight', it changes the focus to the next tab.
	 * If the key pressed is 'ArrowLeft', it changes the focus to the previous tab.
	 *
	 * @param {Event} e - The keydown event object.
	 */
	onTablistKeydown( e ) {
		if ( e.key === 'ArrowRight' ) {
			this.handleTabFocusChange( 'right' );
		} else if ( e.key === 'ArrowLeft' ) {
			this.handleTabFocusChange( 'left' );
		}
	}

	/**
	 * Adds event listeners for header click, tablist scroll, and tablist keydown.
	 */
	resume() {
		this.header.addEventListener( 'click', this.onHeaderClick );
		this.tablist.addEventListener( 'scroll', this.onTablistScroll );
		this.tablist.addEventListener( 'keydown', this.onTablistKeydown );

		if ( window.ResizeObserver ) {
			const headerOverflowObserver = new ResizeObserver( this.debounceUpdateHeaderOverflow() );
			headerOverflowObserver.observe( this.tablist );
		}
	}

	/**
	 * Removes event listeners for header click, tablist scroll, and tablist keydown.
	 */
	pause() {
		this.header.removeEventListener( 'click', this.onHeaderClick );
		this.tablist.removeEventListener( 'scroll', this.onTablistScroll );
		this.tablist.removeEventListener( 'keydown', this.onTablistKeydown );
	}

	/**
	 * Initializes the TabberEvent instance by creating an IntersectionObserver to handle tabber visibility.
	 * When the tabber intersects with the viewport, it resumes event listeners for header click, tablist scroll, and tablist keydown.
	 * Otherwise, it pauses the event listeners.
	 */
	init() {
		// eslint-disable-next-line compat/compat
		this.observer = new IntersectionObserver( ( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					this.resume();
				} else {
					this.pause();
				}
			} );
		} );
		this.observer.observe( this.tabber );
		this.resume();
	}
}

/**
 * Class responsible for creating tabs, headers, and indicators for a tabber element.
 *
 * @class TabberBuilder
 */
class TabberBuilder {
	constructor( tabber ) {
		this.tabber = tabber;
		this.header = this.tabber.querySelector( ':scope > .tabber__header' );
		this.tablist = document.createElement( 'nav' );
		this.indicator = document.createElement( 'div' );
	}

	/**
	 * Sets the attributes of a tab element.
	 *
	 * @param {Element} tab - The tab element to set attributes for.
	 * @param {string} tabId - The ID of the tab element.
	 */
	setTabAttributes( tab, tabId ) {
		const tabAttributes = {
			class: 'tabber__tab',
			role: 'tab',
			'aria-selected': false,
			'aria-controls': tabId,
			href: '#' + tabId,
			id: 'tab-' + tabId
		};

		Util.setAttributes( tab, tabAttributes );
	}

	/**
	 * Creates a tab element with the given title attribute and tab ID.
	 *
	 * @param {string} titleAttr - The title attribute for the tab element.
	 * @param {string} tabId - The ID of the tab element.
	 * @return {Element} The created tab element.
	 */
	createTab( titleAttr, tabId ) {
		const tab = document.createElement( 'a' );

		if ( config.parseTabName ) {
			tab.innerHTML = titleAttr;
		} else {
			tab.textContent = titleAttr;
		}

		this.setTabAttributes( tab, tabId );

		return tab;
	}

	/**
	 * Sets the attributes of a tab panel element.
	 *
	 * @param {Element} tabpanel - The tab panel element to set attributes for.
	 * @param {string} tabId - The ID of the tab panel element.
	 */
	setTabpanelAttributes( tabpanel, tabId ) {
		const tabpanelAttributes = {
			role: 'tabpanel',
			'aria-labelledby': `tab-${ tabId }`,
			id: tabId
		};

		Util.setAttributes( tabpanel, tabpanelAttributes );
	}

	/**
	 * Creates a tab element based on the provided tab panel.
	 *
	 * @param {Element} tabpanel - The tab panel element to create a tab element for.
	 * @return {Element|false} The created tab element, or false if the title attribute is missing
	 * or malformed.
	 */
	createTabElement( tabpanel ) {
		const titleAttr = tabpanel.dataset.mwTabberTitle;

		if ( !titleAttr ) {
			mw.log.error(
				'[TabberNeue] Missing or malformed `data-mw-tabber-title` attribute'
			);
			return false;
		}

		let tabId;
		if ( config.parseTabName ) {
			tabId = Hash.build( Util.extractTextFromHtml( titleAttr ) );
		} else {
			tabId = Hash.build( titleAttr );
		}

		this.setTabpanelAttributes( tabpanel, tabId );

		return this.createTab( titleAttr, tabId );
	}

	/**
	 * Creates tab elements for each tab panel in the tabber.
	 *
	 * It creates a document fragment to hold the tab elements, then iterates over each tab panel
	 * element in the tabber. For each tab panel, it calls the createTabElement method to create a
	 * corresponding tab element and appends it to the fragment. Finally, it adds the fragment
	 * to the tablist element, sets the necessary attributes for the tablist, and adds a
	 * CSS class for styling.
	 */
	createTabs() {
		const fragment = document.createDocumentFragment();
		const tabpanels = this.tabber.querySelectorAll(
			':scope > .tabber__section > .tabber__panel'
		);
		tabpanels.forEach( ( tabpanel ) => {
			fragment.append( this.createTabElement( tabpanel ) );
		} );

		this.tablist.append( fragment );
		this.tablist.classList.add( 'tabber__tabs' );
		this.tablist.setAttribute( 'role', 'tablist' );
	}

	/**
	 * Creates the indicator element for the tabber.
	 *
	 * This method creates a div element to serve as the indicator for the active tab.
	 * It adds the 'tabber__indicator' CSS class to the indicator element and appends it to the
	 * header of the tabber.
	 */
	createIndicator() {
		const indicator = document.createElement( 'div' );
		indicator.classList.add( 'tabber__indicator' );
		this.header.append( indicator );
	}

	/**
	 * Creates the header elements for the tabber.
	 *
	 * This method creates two buttons for navigating to the previous and next tabs,
	 * adds a tablist element. Finally, it appends all these elements to the header of the tabber.
	 */
	createHeader() {
		const prevButton = document.createElement( 'button' );
		prevButton.classList.add( 'tabber__header__prev' );

		const nextButton = document.createElement( 'button' );
		nextButton.classList.add( 'tabber__header__next' );

		this.header.append( prevButton, this.tablist, nextButton );
	}

	/**
	 * Initializes the TabberBuilder by creating tabs, header, and indicator elements.
	 * Also updates the indicator using TabberAction.
	 */
	init() {
		this.createTabs();
		this.createHeader();
		this.createIndicator();
		const firstTab = this.tablist.querySelector( '.tabber__tab' );
		TabberAction.setActiveTab( firstTab );
		TabberAction.updateHeaderOverflow( this.tabber );
		setTimeout( () => {
			const tabberEvent = new TabberEvent( this.tabber, this.tablist );
			tabberEvent.init();
			this.tabber.classList.add( 'tabber--live' );
		}, 10 );
	}
}

/**
 * Loads tabbers with the given elements using the provided configuration.
 *
 * @param {NodeList} tabberEls - The elements representing tabbers to be loaded.
 * @return {void}
 */
function load( tabberEls ) {
	mw.loader.load( 'ext.tabberNeue.icons' );

	Hash.init();

	tabberEls.forEach( ( tabberEl ) => {
		const tabberBuilder = new TabberBuilder( tabberEl );
		tabberBuilder.init();
	} );

	const urlHash = window.location.hash;
	if ( Hash.exists( urlHash ) ) {
		const activeTab = document.getElementById( `tab-${ urlHash }` );
		const activeTabpanel = document.getElementById( urlHash );
		TabberAction.setActiveTab( activeTab );
		window.requestAnimationFrame( () => {
			activeTabpanel.scrollIntoView( {
				behavior: 'auto',
				block: 'end',
				inline: 'nearest'
			} );
		} );
	}

	TabberAction.attachEvents();
	// Delay animation execution so it doesn't not animate the tab gets into position on load
	setTimeout( () => {
		TabberAction.toggleAnimation( true );
	}, 250 );
}

/**
 * Main function that initializes the tabber functionality on the page.
 * It selects all tabber elements that are not live, checks if there are any tabber elements
 * present, and then calls the load function to load the tabber functionality on
 * each tabber element.
 */
function main() {
	const tabberEls = document.querySelectorAll( '.tabber:not(.tabber--live)' );

	if ( tabberEls.length === 0 ) {
		return;
	}

	load( tabberEls );
}

mw.hook( 'wikipage.content' ).add( () => {
	main();
} );

mw.loader.using( 'ext.visualEditor.desktopArticleTarget.init' ).done( () => {
	// After saving edits
	mw.hook( 'postEdit.afterRemoval' ).add( () => {
		main();
	} );
} );
