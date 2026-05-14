import { ComponentFixture, TestBed } from "@angular/core/testing";
import { EMPTY, of, throwError } from "rxjs";
import { ShoppingListsComponent } from "./shopping-lists.component";
import { ShoppingListService } from "../../services/shopping-list.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { ShoppingList } from "../../models";

const mockList: ShoppingList = {
  _id: "list1",
  name: "Weekly Shop",
  items: [
    { productName: "Milk", quantity: 2, purchased: false },
    { productName: "Bread", quantity: 1, purchased: true },
  ],
  status: "active",
};

describe("ShoppingListsComponent", () => {
  let component: ShoppingListsComponent;
  let fixture: ComponentFixture<ShoppingListsComponent>;
  let shoppingListSpy: any;
  let toastSpy: any;

  beforeEach(async () => {
    shoppingListSpy = {
      getLists: jest.fn().mockReturnValue(of({ lists: [mockList] })),
      getList: jest.fn().mockReturnValue(of({ list: mockList })),
      createList: jest.fn().mockReturnValue(of({ list: mockList })),
      updateList: jest.fn().mockReturnValue(of({ list: mockList })),
      deleteList: jest.fn().mockReturnValue(of({ message: "Deleted" })),
      toggleItem: jest.fn().mockReturnValue(of({ list: mockList })),
      getRecommendations: jest.fn().mockReturnValue(
        of({
          recommendations: [{ productName: "Eggs", frequency: 5 }],
          weekday: 1,
        })
      ),
    };
    toastSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ShoppingListsComponent],
      providers: [
        { provide: ShoppingListService, useValue: shoppingListSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingListsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should be created", () => {
    expect(component).toBeTruthy();
  });

  it("should load lists on init", () => {
    expect(shoppingListSpy.getLists).toHaveBeenCalled();
    expect(component.lists().length).toBe(1);
  });

  it("should load recommendations on init", () => {
    expect(shoppingListSpy.getRecommendations).toHaveBeenCalled();
    expect(component.recommendations().length).toBe(1);
  });

  describe("createList()", () => {
    it("should call service.createList with newListName", () => {
      component.newListName.set("Test List");
      component.createList();
      expect(shoppingListSpy.createList).toHaveBeenCalledWith(
        "Test List",
        expect.any(Array)
      );
    });

    it("should not call service if name is empty", () => {
      component.newListName.set("");
      component.createList();
      expect(shoppingListSpy.createList).not.toHaveBeenCalled();
    });

    it("should show error toast on failure", () => {
      shoppingListSpy.createList.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.newListName.set("Test");
      component.createList();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });
  });

  describe("selectList()", () => {
    it("should set selectedList signal", () => {
      component.selectList(mockList);
      expect(component.selectedList()).toBe(mockList);
    });
  });

  describe("toggleItem()", () => {
    it("should call service.toggleItem", () => {
      component.selectList(mockList);
      component.toggleItem(0);
      expect(shoppingListSpy.toggleItem).toHaveBeenCalledWith("list1", 0);
    });
  });

  describe("deleteList()", () => {
    it("should call service.deleteList and reload", () => {
      component.deleteList("list1");
      expect(shoppingListSpy.deleteList).toHaveBeenCalledWith("list1");
    });
  });

  describe("addRecommendedItem()", () => {
    it("should add the recommendation to the new items staging area", () => {
      component.addRecommendedItem({ productName: "Eggs", frequency: 5 });
      expect(component.newItems().some((i) => i.productName === "Eggs")).toBe(
        true
      );
    });
  });
});
