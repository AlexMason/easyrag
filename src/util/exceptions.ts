import { Model, ModelType } from "../models/model";
import { ClientRegisterable } from "../registerable/registerable.interface";

export class MissingClientException extends Error {
  constructor(resource: ClientRegisterable | Model) {
    super(`The client has not been initalized for the ${resource.type} resource. Did you register ${resource.name} with 'client.register( resource )'?`);
    this.name = "MissingClientException"
  }
}

export class MissingModelException extends Error {
  constructor(type: ModelType) {
    super(`Register a ${type} model first.`);
    this.name = "MissingToolAdapterException"
  }
}