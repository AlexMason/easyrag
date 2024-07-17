import { IModelAdapter } from "../models/model-adapter";

export abstract class IInferenceAdapter {
  abstract modelAdapter: IModelAdapter;
}