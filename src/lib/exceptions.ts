import { Registerable } from "../registerable/registerable.interface";

export class MissingClientException extends Error {
  constructor(resource: Registerable) {
    super(`The client has not been initalized for the ${resource.type} resource. Did you register ${resource.name} with 'client.register( resource )'?`);
    this.name = "MissingClientException"
  }
}
export class MissingToolAdapterException extends Error {
  constructor(resource: Registerable) {
    super(`You must provide a 'toolAdapter' to the client options if you are using tools.`);
    this.name = "MissingToolAdapterException"
  }
}