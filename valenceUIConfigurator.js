/**
 * Wraps some of the basic functionality of participating in the Valence UI as a custom configuration screen.
 *
 * Extend this class with your own custom component in order to simplify making a Valence UI plugin.
 *
 * There are two methods you must implement in your sub-class:
 *
 * object getDefaultShape()
 * - Return the "default" version of your configuration; what is your base template like? Example: {"style" : "neutral", "runAlways" : false}
 *
 * boolean computeValid()
 * - Return a true/false boolean for whether the current configuration of the component is valid, which allows the User to save it to the server
 *
 * There's a special method for you to call every time you mutate the configuration so that the container above us gets the change.
 *
 * void configUpdated()
 *
 * There are several lifecycle hooks you can use if you want to react to properties being set. Otherwise just use connectedCallback() to inspect the properties
 * as you are doing first-time setup on your component.
 *
 * void onSetLink() - fired when the 'link' property is populated
 * void onSetSchema() - fired when the 'schema' property is populated
 * void onSetMapping() - fired when the 'mapping' property is populated
 * void onSetConfiguration() - fired when the 'configuration' property is populated
 * object tweakConfiguration() - allows you to override the configuration that is kicked up the chain, good place to strip any extra stuff you added to it for your own UI purposes
 *
 * There are some convenience methods available to make your life a little easier:
 *
 * trackChange()
 * You can bind an onchange event directly to this method as long as your "name" attribute on the component matches a configuration property. This method will
 * read the changed value and set it on the configuration.
 * Example: <lightning-input type="checkbox" name="active" onchange={trackChange}></lightning> will set configuration.active = boolean true or false
 *
 * debounceChange()
 * You can bind an onchange event directly to this method as long as your "name" attribute on the component matches a configuration property. This method will
 * read the changed value and set it on the configuration after a short delay (that's the debounce part).
 * Example: <lightning-input name="flavor" onchange={debounceChange}></lightning> will set configuration.flavor = user's input
 *
 * debounce()
 * Available to you if you need to wrap your own logic around handling a value, but would still like to take advantage of debounce behavior.
 */

import {api, track, LightningElement} from 'lwc';

export default class ValenceUIConfigurator extends LightningElement {

	_link = {}; // info about the Link
	_schema = {}; // info about the source and target schemas
	_mapping = {}; // info about the mapping, if this configuration is tied to a single mapping
	@track _configuration = {}; // the current configuration

	constructor() {
		super();

		if(new.target === 'ValenceUIConfigurator') {
			throw new TypeError('You cannot instantiate ValenceUIConfigurator directly; instead you should extend it.');
		}

		if(this.getDefaultShape === undefined) {
			throw new TypeError('Your Valence UI configurator plugin must implement the getDefaultShape() method, see https://docs.valence.app');
		}

		if(this.computeValid === undefined) {
			throw new TypeError('Your Valence UI configurator plugin must implement the computeValid() method, see https://docs.valence.app');
		}
	}

	get link() {
		return this._link;
	}

	@api set link(newValue) {
		this._link = newValue;
		if(this.onSetLink) {
			this.onSetLink();
		}
	}

	get schema() {
		return this._schema;
	}

	@api set schema(newValue) {
		this._schema = newValue;
		if(this.onSetSchema) {
			this.onSetSchema();
		}
	}

	get mapping() {
		return this._mapping;
	}

	@api set mapping(newValue) {
		this._mapping = newValue;
		if(this.onSetMapping) {
			this.onSetMapping();
		}
	}

	get configuration() {
		return this._configuration;
	}

	/**
	 * Called by Valence to initialize configuration at the start, and also to reset it when the user clicks "Discard Changes"
	 *
	 * @param newConfig
	 */
	@api set configuration(newConfig) {
		this._configuration = newConfig && Object.keys(newConfig).length > 0 ? JSON.parse(JSON.stringify(newConfig)) : this.getDefaultShape();
		if(this.onSetConfiguration) {
			this.onSetConfiguration();
		}
	}

	/**
	 * Invoke this method in order to notify Valence that you have made changes to the configuration. This triggers things like showing the Save/Discard buttons
	 * if the state is dirty, and calling your computeValid() method to check if the Save button should be enabled or disabled.
	 */
	configUpdated() {
		this.dispatchEvent(new CustomEvent('updateconfig', {
			detail : {
				newValue : this.tweakConfiguration ? this.tweakConfiguration() : this.configuration,
				isValid : this.computeValid()
			}
		}));
	}

	/**
	 * Handler for a change event.
	 *
	 * It expects the "name" attribute of the component that generated the event to match a configuration property.
	 *
	 * Sets the value from the change to the configuration, and notifies Valence that the configuration was modified.
	 *
	 * @param event A change event from an LWC
	 */
	trackChange(event) {
		this.configuration[event.target.name] = this._extractInputValue(event);
		this.configUpdated();
	}

	/**
	 * Handler for a change event, but with debounce baked-in. This means rapid change events in quick succession will be rolled together, which is gentler
	 * on anything taking actions in reaction to these changes. Generally preferred over trackChanges() for things like string input fields.
	 *
	 * It expects the "name" attribute of the component that generated the event to match a configuration property.
	 *
	 * Sets the value from the change to the configuration, and notifies Valence that the configuration was modified.
	 *
	 * @param event A change event from an LWC
	 */
	debounceChange(event) {
		const propName = event.target.name, value = this._extractInputValue(event);
		this.debounce(() => {
				this.configuration[propName] = value;
				this.configUpdated();
			}
		);
	}

	_extractInputValue(event) {
		return ['checkbox','radio'].includes(event.target.type) ? event.target.checked : event.target.value;
	}

	/**
	 * Utility function to help our subclasses debounce their inputs. This just means you can react to user typing
	 * in a nice way (if they pause or finish typing you can do an action) but you don't start that action until they
	 * are done. A little friendlier than using onblur events. Use onchange and wrap your action in debounce().
	 */
	debounce(callback, delay = 300) {
		clearTimeout(this._debounceTimer);
		this._debounceTimer = setTimeout(callback, delay);
	}
}
