import {IInputs, IOutputs} from "./generated/ManifestTypes";
import { UpdateEvent } from "./models/UpdateEvent";

export class WhatWillHappen implements ComponentFramework.StandardControl<IInputs, IOutputs> {

	private _context: ComponentFramework.Context<IInputs>;
	private _container: HTMLDivElement;
	private _table: string;
	private _formId: string;
	private _column: string | undefined;
	private _events: Array<UpdateEvent>;

	private _button: HTMLButtonElement;
	private _content: HTMLDivElement;

	/**
	 * Empty constructor.
	 */
	constructor() {
		this._events = new Array<UpdateEvent>();
	}

	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
		this._context = context;
		this._container = container;
		this._table = (this._context as any).page.entityTypeName;
		this._formId = (window as any).getCurrentXrm()._page._ui.formSelector.getCurrentItem().getId();
		this._column = this._context.parameters.column!.attributes?.LogicalName;
		this.Render();
		this.RetrieveRelatedWorkflows();
		this.RetrieveRelatedSteps();
	}

	private Render(): void {

		this._button = document.createElement("button");
		this._button.className = "collapsible";
		this._button.addEventListener("click", this.ShowHiddenContent.bind(this));
		this._container.appendChild(this._button);

		this._content = document.createElement("div");
		this._content.className = "infocontent";
		this._content.style.display = "none";
		this._container.appendChild(this._content);
	}

	private GetButtonLabel(): string {
		if (this._events.length == 0)
			return "No events related to " + this._context.parameters.column!.attributes?.DisplayName!;
		else if (this._events.length == 1)
			return "A event is related to " + this._context.parameters.column!.attributes?.DisplayName!;
		else
			return this._events.length + " events are related to " + this._context.parameters.column!.attributes?.DisplayName!;
	}

	private ShowHiddenContent() {
		if (this._content.style.display === "block") {
			this._content.style.display = "none";
		} else {
			this._content.style.display = "block";
			this._content.style.width = this._button.offsetWidth + "px";
		}
	}

	private RetrieveRelatedWorkflows(): void {
		const self = this;
		this._context.webAPI.retrieveMultipleRecords("workflow",
			"?$select=workflowid,name,description,category&$filter=statecode eq 1 and primaryentity eq '" + this._table + "' and contains(triggeronupdateattributelist, '" + this._column + "') and (formid eq null or formid eq " + this._formId + ")")
			.then(
				function success(result) {
					for (var i = 0; i < result.entities.length; i++) {
						var workflow_ = new UpdateEvent();
						workflow_.Id = result.entities[i].workflowid;
						workflow_.Name = result.entities[i].name;
						workflow_.Description = result.entities[i].description;
						workflow_.Type = result.entities[i]["category@OData.Community.Display.V1.FormattedValue"];
						self._events.push(workflow_);
					}

					self._button.innerText = self.GetButtonLabel();
					self._content.innerText = self._context.parameters.content_level.raw == "0" ? self.GetSimpleContent() : self.GetDetailedContent();
				},
				function (error) {
					console.log(error.message);
				}
			);
	}

	private RetrieveRelatedSteps(): void {
		const self = this;
		this._context.webAPI.retrieveMultipleRecords("sdkmessageprocessingstep",
			"?$select=name,description,sdkmessageprocessingstepid,sdkmessagefilterid&$expand=sdkmessagefilterid($select=primaryobjecttypecode)&$filter=statecode eq 0 and ishidden/Value eq false and contains(filteringattributes, '" + this._column + "') and sdkmessagefilterid/primaryobjecttypecode eq '" + this._table + "'")
			.then(
				function success(result) {
					for (var i = 0; i < result.entities.length; i++) {
						var sdkStep = new UpdateEvent();
						sdkStep.Id = result.entities[i].sdkmessageprocessingstepid;
						sdkStep.Name = result.entities[i].name;
						sdkStep.Description = result.entities[i].description;
						sdkStep.Type = "Plugin";
						self._events.push(sdkStep);
					}

					self._button.innerText = self.GetButtonLabel();
					self._content.innerText = self._context.parameters.content_level.raw == "0" ? self.GetSimpleContent() : self.GetDetailedContent();
				},
				function (error) {
					console.log(error.message);
				}
			);
	}

	private GetSimpleContent(): string {
		return this._events.sort((n1, n2) => {
			if (n1.Type > n2.Type) {
				return 1;
			}

			if (n1.Type < n2.Type) {
				return -1;
			}

			return 0;
		}).map(m => "> " + m.Description).join("\r\n");
	}

	private GetDetailedContent(): string {
		return this._events.sort((n1, n2) => {
			if (n1.Type > n2.Type) {
				return 1;
			}

			if (n1.Type < n2.Type) {
				return -1;
			}

			return 0;
		}).map(m => "> [" + m.Type + "] " + m.Description).join("\r\n");
	}

	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void {
		this._context = context;
	}

	/**
	 * It is called by the framework prior to a control receiving new data.
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs {
		return {};
	}

	/**
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void {
		this._events = new Array<UpdateEvent>();
	}
}